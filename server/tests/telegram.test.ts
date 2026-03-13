import { describe, expect, it, vi } from "vitest";
import { startTelegramRuntime } from "../telegram";
import { createGracefulShutdown } from "../lifecycle";

const createBotMock = () => ({
  telegram: {
    deleteWebhook: vi.fn().mockResolvedValue(undefined),
    setWebhook: vi.fn().mockResolvedValue(undefined),
  },
  launch: vi.fn().mockResolvedValue(undefined),
});

describe("Telegram runtime", () => {
  it("uses webhook mode when WEBHOOK_URL is set", async () => {
    const bot = createBotMock();
    const logger = {
      log: vi.fn(),
      warn: vi.fn(),
      error: vi.fn(),
    };

    const mode = await startTelegramRuntime({
      bot,
      webhookUrl: "https://example.com",
      webhookPath: "/tg/webhook",
      isProduction: true,
      logger,
    });

    expect(mode).toBe("webhook");
    expect(bot.telegram.deleteWebhook).toHaveBeenCalledWith({
      drop_pending_updates: true,
    });
    expect(bot.telegram.setWebhook).toHaveBeenCalledWith(
      "https://example.com/tg/webhook",
    );
    expect(bot.launch).not.toHaveBeenCalled();
    expect(logger.log).toHaveBeenCalledWith("Bot mode: webhook");
  });

  it("uses polling mode when WEBHOOK_URL is missing in dev", async () => {
    const bot = createBotMock();
    const logger = {
      log: vi.fn(),
      warn: vi.fn(),
      error: vi.fn(),
    };

    const mode = await startTelegramRuntime({
      bot,
      webhookPath: "/tg/webhook",
      isProduction: false,
      logger,
    });

    expect(mode).toBe("polling");
    expect(bot.telegram.deleteWebhook).toHaveBeenCalledWith({
      drop_pending_updates: true,
    });
    expect(bot.launch).toHaveBeenCalledWith({ polling: { timeout: 30 } });
    expect(bot.telegram.setWebhook).not.toHaveBeenCalled();
    expect(logger.log).toHaveBeenCalledWith("Bot mode: polling");
  });

  it("disables bot when WEBHOOK_URL is missing in production", async () => {
    const bot = createBotMock();
    const logger = {
      log: vi.fn(),
      warn: vi.fn(),
      error: vi.fn(),
    };

    const mode = await startTelegramRuntime({
      bot,
      webhookPath: "/tg/webhook",
      isProduction: true,
      logger,
    });

    expect(mode).toBe("disabled");
    expect(bot.launch).not.toHaveBeenCalled();
    expect(bot.telegram.setWebhook).not.toHaveBeenCalled();
    expect(logger.warn).toHaveBeenCalled();
  });
});

describe("Graceful shutdown", () => {
  it("stops bot and closes server", () => {
    const bot = { stop: vi.fn() };
    const server = {
      close: vi.fn((cb?: () => void) => cb?.()),
    };
    const logger = { log: vi.fn() };

    const shutdown = createGracefulShutdown({
      bot,
      httpServer: server as any,
      logger,
    });

    shutdown("SIGTERM");

    expect(bot.stop).toHaveBeenCalledWith("SIGTERM");
    expect(server.close).toHaveBeenCalled();
    expect(logger.log).toHaveBeenCalledWith("SIGTERM received, stopping bot...");
    expect(logger.log).toHaveBeenCalledWith("[shutdown] server closed (SIGTERM)");
  });
});
