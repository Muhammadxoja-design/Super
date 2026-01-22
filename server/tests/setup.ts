process.env.NODE_ENV = "test";
process.env.SESSION_SECRET = "test-secret";
process.env.DATABASE_URL =
  process.env.DATABASE_URL ||
  "postgres://postgres:postgres@localhost:5432/taskbotfergana_test";
process.env.BOT_TOKEN = "";
process.env.WEBHOOK_URL = "";
process.env.WEBHOOK_PATH = "/telegraf";
