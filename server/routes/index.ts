import type { Express } from "express";
import type { Server } from "http";
import { 
  normalizeBotToken, 
  normalizeWebhookPath, 
  normalizeWebhookUrl,
  createUpdateLogger,
} from "../utils/helpers";
import { setSubscriptionBot } from "../subscription";
import { TelegrafConstructor } from "../telegraf";
import type { Telegraf } from "../telegraf";
import { startTelegramRuntime } from "../telegram";
import { startQueueWorker } from "../queue-worker";
import { createGracefulShutdown } from "../lifecycle";

import healthRoutes from "./health.routes";
import authRoutes from "./auth.routes";
import taskRoutes from "./task.routes";
import adminRoutes from "./admin.routes";
import aiRoutes from "./ai.routes";
import { setupBotHandlers, setupBotWebhook } from "./bot.routes";

export let runtimeBot: Telegraf | null = null;
export const webAppUrl = process.env.WEBAPP_URL?.trim();

export async function registerRoutes(
  httpServer: Server,
  app: Express,
): Promise<Server> {
  const botTokenRaw = process.env.BOT_TOKEN;
  const botToken = normalizeBotToken(botTokenRaw);
  const telegramRequired = process.env.TELEGRAM_REQUIRED === "true";
  const webhookUrl = normalizeWebhookUrl(process.env.WEBHOOK_URL);
  const isProduction = process.env.NODE_ENV === "production";
  const webhookPath = normalizeWebhookPath(process.env.WEBHOOK_PATH || "/telegraf");

  let bot: Telegraf | null = null;
  let stopQueueWorker: (() => void) | null = null;

  // 1. Health Routes
  app.use(healthRoutes);

  // 2. Bot Initialization
  if (botToken) {
    bot = new TelegrafConstructor(botToken);
    runtimeBot = bot;
    setSubscriptionBot(bot);

    bot.catch((err, ctx) => {
      console.error("Telegram bot error:", err, {
        updateId: ctx.update?.update_id,
      });
    });

    try {
      await bot.telegram.getMe();
      console.log(`[telegram] Bot initialized`);
    } catch (error) {
      console.error("[telegram] Bot getMe failed:", error);
      if (process.env.NODE_ENV !== "test" && telegramRequired) {
        process.exit(1);
      }
    }

    // 3. Bot Handlers
    setupBotHandlers(bot, webAppUrl);

    // 4. Bot Webhook
    setupBotWebhook(app, bot);

    // 5. Start Runtime
    await startTelegramRuntime({
      bot,
      webhookUrl,
      webhookPath,
      isProduction,
    });

    // 6. Start Queue Worker
    stopQueueWorker = startQueueWorker({ bot, webAppUrl });
  } else {
    console.error("BOT_TOKEN is missing. Telegram bot cannot start.");
    if (process.env.NODE_ENV !== "test" && telegramRequired) {
      process.exit(1);
    }
  }

  // 7. Express API Routes
  app.use(authRoutes);
  app.use(taskRoutes);
  app.use(adminRoutes);
  app.use(aiRoutes);

  // 8. Lifecycle & Shutdown
  const shutdownBase = createGracefulShutdown({ bot, httpServer });
  const shutdown = (signal: string) => {
    if (stopQueueWorker) {
      stopQueueWorker();
    }
    shutdownBase(signal);
  };

  process.once("SIGINT", () => shutdown("SIGINT"));
  process.once("SIGTERM", () => shutdown("SIGTERM"));

  return httpServer;
}
