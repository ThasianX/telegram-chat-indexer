import { Database } from "./db";
import { TelegramIndexer } from "./client";

async function main() {
    console.log("🚀 Starting Telegram Message Indexer...");

    // Initialize database
    const db = new Database();
    await db.connect();

    // Initialize Telegram client
    const indexer = new TelegramIndexer(db);
    await indexer.start();

    console.log("✨ Telegram Message Indexer is running!");
    console.log("Press Ctrl+C to stop");

    // Handle graceful shutdown
    process.on("SIGINT", async () => {
        console.log("\n👋 Shutting down...");
        await indexer.stop();
        process.exit(0);
    });
}

main().catch((error) => {
    console.error("❌ Fatal error:", error);
    process.exit(1);
});
