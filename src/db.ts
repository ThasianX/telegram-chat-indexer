import { Pool } from "pg";
import { Api } from "telegram";

export class Database {
    private pool: Pool;

    constructor() {
        this.pool = new Pool();
    }

    async connect(): Promise<void> {
        try {
            const client = await this.pool.connect();
            console.log("✅ Connected to PostgreSQL");
            client.release();
        } catch (error) {
            console.error("❌ Failed to connect to PostgreSQL:", error);
            throw error;
        }
    }

    async insertMessage(
        message: Api.Message,
        chat: { id: string; name: string }
    ) {
        const client = await this.pool.connect();
        try {
            if (!message.message) {
                return false;
            }
            const sender = (await message.getSender()) as any;

            await client.query(
                `
        INSERT INTO messages (
          message_id, chat_id, chat_name, user_id, user_display_name, user_username, text, date, edit_date, reply_to_message_id
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
        ON CONFLICT (chat_id, message_id) DO UPDATE SET
          text = EXCLUDED.text,
          edit_date = EXCLUDED.edit_date
      `,
                [
                    message.id,
                    chat.id,
                    chat.name,
                    sender?.id.toString() || null,
                    sender?.firstName
                        ? `${sender.firstName}${
                              sender.lastName ? ` ${sender.lastName}` : ""
                          }`
                        : sender?.title || null,
                    sender?.username ?? null,
                    message.message || null,
                    new Date(message.date * 1000),
                    message.editDate ? new Date(message.editDate * 1000) : null,
                    message.replyTo?.replyToMsgId || null,
                ]
            );
        } finally {
            client.release();
            return true;
        }
    }

    async insertMessagesBulkWithBatching(
        messages: Api.Message[],
        chat: { id: string; name: string },
        batchSize: number = 100
    ) {
        if (!messages.length) {
            return { success: true, inserted: 0, failed: [] };
        }

        const client = await this.pool.connect();

        try {
            await client.query("BEGIN");

            let totalInserted = 0;
            const allFailed: number[] = [];

            // Process messages in batches
            for (let i = 0; i < messages.length; i += batchSize) {
                const batch = messages.slice(i, i + batchSize);
                const validBatch = batch.filter((m) => m.message);

                if (!validBatch.length) continue;

                // Fetch senders for this batch
                const senders = await Promise.all(
                    validBatch.map(async (message) => {
                        try {
                            return (await message.getSender()) as any;
                        } catch (error) {
                            console.error(
                                `Failed to get sender for message ${message.id}:`,
                                error
                            );
                            return null;
                        }
                    })
                );

                // Prepare batch insert
                const values: any[] = [];
                const placeholders: string[] = [];
                let paramIndex = 1;

                validBatch.forEach((message, j) => {
                    const sender = senders[j];

                    if (!sender && message.senderId) {
                        allFailed.push(message.id);
                        return;
                    }

                    const rowPlaceholders = Array.from(
                        { length: 10 },
                        (_, k) => `$${paramIndex + k}`
                    ).join(", ");
                    placeholders.push(`(${rowPlaceholders})`);

                    values.push(
                        message.id,
                        chat.id,
                        chat.name,
                        sender?.id.toString() || null,
                        sender?.firstName
                            ? `${sender.firstName}${
                                  sender.lastName ? ` ${sender.lastName}` : ""
                              }`
                            : sender?.title || null,
                        sender?.username ?? null,
                        message.message || null,
                        new Date(message.date * 1000),
                        message.editDate
                            ? new Date(message.editDate * 1000)
                            : null,
                        message.replyTo?.replyToMsgId || null
                    );

                    paramIndex += 10;
                });

                if (placeholders.length) {
                    const query = `
                    INSERT INTO messages (
                        message_id, chat_id, chat_name, user_id, user_display_name, 
                        user_username, text, date, edit_date, reply_to_message_id
                    ) VALUES ${placeholders.join(", ")}
                    ON CONFLICT (chat_id, message_id) DO UPDATE SET
                        text = EXCLUDED.text,
                        edit_date = EXCLUDED.edit_date
                `;

                    const result = await client.query(query, values);
                    totalInserted += result.rowCount || 0;
                }

                // Log progress for large datasets
                if (messages.length > 1000 && (i + batchSize) % 1000 === 0) {
                    console.log(
                        `Processed ${Math.min(
                            i + batchSize,
                            messages.length
                        )} / ${messages.length} messages`
                    );
                }
            }

            await client.query("COMMIT");

            return {
                success: true,
                inserted: totalInserted,
                failed: allFailed,
            };
        } catch (error) {
            await client.query("ROLLBACK");
            console.error("Bulk insert transaction failed:", error);
            throw error;
        } finally {
            client.release();
        }
    }

    async insertChat(chat: any, chatId: string): Promise<void> {
        const client = await this.pool.connect();
        try {
            await client.query(
                `
        INSERT INTO chats (id, title)
        VALUES ($1, $2)
        ON CONFLICT (id) DO UPDATE SET
          title = EXCLUDED.title,
          updated_at = CURRENT_TIMESTAMP
      `,
                [chatId, chat.title]
            );
        } finally {
            client.release();
        }
    }

    async close(): Promise<void> {
        await this.pool.end();
    }
}
