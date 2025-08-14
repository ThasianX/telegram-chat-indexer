import { TelegramClient } from "telegram";
import { StringSession } from "telegram/sessions";
import { NewMessage, NewMessageEvent } from "telegram/events";
// @ts-ignore
import input from "input";
import { config } from "./config";
import { Database } from "./db";
import fs from "fs/promises";

export class TelegramIndexer {
    private client: TelegramClient;
    private db: Database;
    private monitoredChats: Record<string, string> = {};

    constructor(database: Database) {
        const session = new StringSession(config.telegram.sessionString);
        this.client = new TelegramClient(
            session,
            config.telegram.apiId,
            config.telegram.apiHash,
            {
                connectionRetries: 5,
            }
        );
        this.db = database;
    }

    async start(): Promise<void> {
        console.log("🔄 Connecting to Telegram...");

        await this.client.start({
            phoneNumber: async () =>
                await input.text("Please enter your phone number: "),
            password: async () =>
                await input.text("Please enter your password: "),
            phoneCode: async () =>
                await input.text("Please enter the code you received: "),
            onError: (err) =>
                console.error("Error during authentication:", err),
        });

        console.log("✅ Connected to Telegram");

        // Save session string for future use
        const sessionString = this.client.session.save() as unknown as string;
        if (sessionString && sessionString !== config.telegram.sessionString) {
            console.log(
                "💾 New session string generated. Updating .env file..."
            );
            await this.updateEnvFile("SESSION_STRING", sessionString);
        }

        await this.setupMonitoredChats();
        // await this.indexHistoricalMessages();
        this.setupMessageHandler();
    }

    private async getAllChats() {
        const dialogs = await this.client.getDialogs();
        for (const di of dialogs) {
            console.log(`${di.title} - ${di.id}`);
        }
    }

    private async updateEnvFile(key: string, value: string): Promise<void> {
        try {
            let envContent = await fs.readFile(".env", "utf-8");
            const regex = new RegExp(`^${key}=.*$`, "m");

            if (regex.test(envContent)) {
                envContent = envContent.replace(regex, `${key}=${value}`);
            } else {
                envContent += `\n${key}=${value}`;
            }

            await fs.writeFile(".env", envContent);
        } catch (error) {
            console.warn(
                "⚠️ Could not update .env file. Please manually update SESSION_STRING"
            );
            console.log(`SESSION_STRING=${value}`);
        }
    }

    private async setupMonitoredChats(): Promise<void> {
        console.log("🔍 Setting up monitored chats...");

        // Add chat IDs
        for (const chat of config.chats) {
            this.monitoredChats[chat.id] = chat.name;
        }

        console.log(
            `📊 Monitoring ${Object.keys(this.monitoredChats).length} chats`
        );
    }

    private async indexHistoricalMessages(): Promise<void> {
        console.log("📥 Indexing historical messages...");

        await Promise.all(
            Object.entries(this.monitoredChats).map(
                async ([chatId, chatName]) => {
                    try {
                        const entity = await this.client.getEntity(chatId);
                        await this.db.insertChat(entity, chatId);

                        console.log(
                            `📜 Fetching history for chat ${chatId}...`
                        );

                        const messages = [];
                        for await (const message of this.client.iterMessages(
                            entity,
                            {
                                limit: 200, // Adjust as needed
                            }
                        )) {
                            messages.push(message);
                        }
                        await this.db.insertMessagesBulkWithBatching(messages, {
                            id: chatId,
                            name: chatName,
                        });
                    } catch (error) {
                        console.error(
                            `❌ Error indexing chat ${chatId}:`,
                            error
                        );
                    }
                }
            )
        );
    }

    private setupMessageHandler(): void {
        console.log("👂 Setting up real-time message listener...");

        this.client.addEventHandler(async (event: NewMessageEvent) => {
            const message = event.message;
            const chatId = message.chatId?.toString();
            const chat = chatId ? this.monitoredChats[chatId] : undefined;

            if (!chat) {
                return;
            }

            try {
                const inserted = await this.db.insertMessage(message, {
                    id: chatId!,
                    name: chat,
                });
                if (inserted) {
                    console.log(
                        `📨 New message in chat ${chat}: ${message.message}`
                    );
                }
            } catch (error) {
                console.error("❌ Error processing message:", error);
            }
        }, new NewMessage({}));

        console.log("✅ Real-time message listener active");
    }

    async stop(): Promise<void> {
        await this.client.disconnect();
        // await this.db.close();
    }
}
