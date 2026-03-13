import { Telegraf } from "telegraf";
import { sql } from "drizzle-orm";
import { db } from "../server/db";
import { storage } from "../server/storage";

const args = process.argv.slice(2);
const confirm = args.includes("--confirm");
const skipNotify = args.includes("--skip-notify");
const messageArgIndex = args.indexOf("--message");

if (!confirm) {
  console.error("This script wipes the database. Add the --confirm flag to proceed.");
  process.exit(1);
}

let messageText: string | undefined;
if (messageArgIndex >= 0) {
  if (messageArgIndex === args.length - 1) {
    console.error("Provide a message string after --message.");
    process.exit(1);
  }
  messageText = args[messageArgIndex + 1];
}

const DEFAULT_CLEAR_MESSAGE =
  "📣 Dasturdagi barcha ma'lumotlar tozalanmoqda. Iltimos, qayta ro'yxatdan o'ting va topshiriqlarni qaytarib oling.";

async function delay(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function notifyAllUsers(message: string) {
  const recipients = await storage.listBroadcastRecipients();
  if (!recipients.length) {
    console.log("No broadcast recipients found, skipping notification.");
    return;
  }

  const botToken = process.env.BOT_TOKEN;
  if (!botToken) {
    throw new Error("BOT_TOKEN is required to notify users.");
  }

  const ratePerSec = Number(process.env.BROADCAST_RATE_PER_SEC) || 20;
  const delayMs = Math.max(50, Math.ceil(1000 / ratePerSec));
  const bot = new Telegraf(botToken);

  console.log(`Sending notification to ${recipients.length} users (${ratePerSec} msg/sec).`);

  for (const user of recipients) {
    const telegramId = user.telegramId;
    if (!telegramId) continue;
    try {
      await bot.telegram.sendMessage(telegramId, message, { parse_mode: "HTML" });
    } catch (error) {
      console.error(`Failed to notify ${telegramId}:`, error);
    }
    await delay(delayMs);
  }

  await bot.stop();
  console.log("Notification broadcast completed.");
}

async function truncateAllTables() {
  await db.execute(sql`
    TRUNCATE
      message_queue,
      broadcast_logs,
      broadcasts,
      task_events,
      task_assignments,
      tasks,
      billing_transactions,
      message_templates,
      sessions,
      audit_logs,
      users
    RESTART IDENTITY CASCADE
  `);
}

async function main() {
  const message = skipNotify
    ? undefined
    : messageText || process.env.CLEAR_DB_MESSAGE || DEFAULT_CLEAR_MESSAGE;

  if (!skipNotify && !message) {
    console.error("No message provided; set CLEAR_DB_MESSAGE or pass --message.");
    process.exit(1);
  }

  if (!skipNotify) {
    await notifyAllUsers(message!);
  } else {
    console.log("Skipping user notification (--skip-notify).");
  }

  await truncateAllTables();
  console.log("Database tables truncated.");
  console.log("Re-run the server so defaults (admin, super admin) can be reseeded.");
}

main().catch((error) => {
  console.error("Database clear script failed:", error);
  process.exit(1);
});
