export type TelegramApiLike = {
  deleteWebhook: (options: { drop_pending_updates: boolean }) => Promise<unknown>;
  setWebhook: (url: string) => Promise<unknown>;
};

export type TelegramBotLike = {
  telegram: TelegramApiLike;
  launch: (options: { polling: { timeout: number } }) => Promise<void>;
};

export type TelegramLogger = Pick<Console, "log" | "warn" | "error">;

export async function startTelegramRuntime(options: {
  bot: TelegramBotLike;
  webhookUrl?: string;
  webhookPath: string;
  isProduction: boolean;
  logger?: TelegramLogger;
}) {
  const { bot, webhookUrl, webhookPath, isProduction } = options;
  const logger = options.logger ?? console;

  if (isProduction && webhookUrl) {
    logger.log("Webhook mode enabled");
    try {
      await bot.telegram.deleteWebhook({ drop_pending_updates: true });
      await bot.telegram.setWebhook(`${webhookUrl}${webhookPath}`);
      logger.log(`Webhook registered: ${webhookUrl}${webhookPath}`);
    } catch (error) {
      logger.error("Failed to configure Telegram webhook:", error);
    }
    return "webhook" as const;
  }

  if (!isProduction) {
    try {
      if (webhookUrl) {
        logger.warn(
          "WEBHOOK_URL is set but NODE_ENV is not production. Polling mode enabled.",
        );
      }
      await bot.telegram.deleteWebhook({ drop_pending_updates: true });
      await bot.launch({ polling: { timeout: 30 } });
      logger.log("Polling mode enabled");
    } catch (error) {
      logger.error("Failed to launch Telegram polling:", error);
    }
    return "polling" as const;
  }

  logger.warn(
    "[telegram] BOT_TOKEN set but WEBHOOK_URL missing in production. Bot not started.",
  );
  return "disabled" as const;
}
