import type { Server } from "http";

export type ShutdownLogger = Pick<Console, "log">;

export function createGracefulShutdown(options: {
  bot?: { stop: (signal: string) => void } | null;
  httpServer: Server;
  logger?: ShutdownLogger;
}) {
  const { bot, httpServer } = options;
  const logger = options.logger ?? console;

  return (signal: string) => {
    logger.log(`${signal} received, stopping bot...`);
    if (bot) {
      bot.stop(signal);
    }
    httpServer.close(() => {
      logger.log(`[shutdown] server closed (${signal})`);
    });
  };
}
