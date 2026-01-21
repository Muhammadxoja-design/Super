import type { Telegraf } from "telegraf";
import { storage } from "./storage";
import { buildTaskStatusKeyboard } from "./telegram-messages";

type Logger = Pick<Console, "log" | "warn" | "error">;

type TelegramSendError = {
  code?: string;
  response?: {
    error_code?: number;
    description?: string;
  };
  description?: string;
  message?: string;
};

const DEFAULT_RATE_PER_SEC = Number(process.env.BROADCAST_RATE_PER_SEC || "25");
const DEFAULT_BATCH_SIZE = Number(process.env.BROADCAST_BATCH_SIZE || "100");
const DEFAULT_RETRY_LIMIT = Number(process.env.BROADCAST_RETRY_LIMIT || "2");
const DEFAULT_RETRY_BASE_MS = Number(process.env.BROADCAST_RETRY_BASE_MS || "1000");

const clampBatchSize = (value: number) => Math.min(200, Math.max(50, value));

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

const logJson = (level: "log" | "warn" | "error", message: string, payload: Record<string, unknown>) => {
  const entry = {
    level,
    message,
    timestamp: new Date().toISOString(),
    ...payload,
  };
  const line = JSON.stringify(entry);
  if (level === "warn") console.warn(line);
  else if (level === "error") console.error(line);
  else console.log(line);
};

const extractErrorCode = (error: TelegramSendError) =>
  error?.response?.error_code ?? null;

const extractErrorMessage = (error: TelegramSendError) =>
  error?.response?.description || error?.description || error?.message || "unknown_error";

const isTransient = (error: TelegramSendError) => {
  const code = extractErrorCode(error);
  if (code === 429) return true;
  if (code && code >= 500 && code <= 599) return true;
  if (error?.code === "ETIMEDOUT" || error?.code === "ECONNRESET") return true;
  return false;
};

const isPermanent = (error: TelegramSendError) => {
  const code = extractErrorCode(error);
  return code === 403 || code === 400;
};

const resolveTelegramStatus = (error: TelegramSendError) => {
  const code = extractErrorCode(error);
  if (code === 403) return "blocked";
  if (code === 400) return "inactive";
  return null;
};

async function sendBroadcastMessage(bot: Telegraf, broadcast: any, telegramId: string) {
  if (broadcast.mediaUrl) {
    await bot.telegram.sendPhoto(telegramId, broadcast.mediaUrl, {
      caption: broadcast.messageText || undefined,
    });
    return;
  }
  await bot.telegram.sendMessage(telegramId, broadcast.messageText || "");
}

async function sendTaskMessage(
  bot: Telegraf,
  payload: { assignmentId: number; text: string; webAppUrl?: string },
  telegramId: string,
) {
  await bot.telegram.sendMessage(
    telegramId,
    payload.text,
    buildTaskStatusKeyboard(payload.assignmentId, payload.webAppUrl),
  );
}

export function startQueueWorker(options: {
  bot: Telegraf;
  webAppUrl?: string;
  logger?: Logger;
}) {
  const { bot, webAppUrl } = options;
  const logger = options.logger ?? console;
  const ratePerSec = Math.max(1, DEFAULT_RATE_PER_SEC);
  const batchSize = clampBatchSize(DEFAULT_BATCH_SIZE);
  const retryLimit = Math.max(0, DEFAULT_RETRY_LIMIT);
  const retryBaseMs = Math.max(250, DEFAULT_RETRY_BASE_MS);

  let stopped = false;

  const processBroadcasts = async () => {
    const [active] =
      (await storage.listBroadcasts({ status: "sending", limit: 1 })) ||
      [];
    const [queued] =
      active ? [] : await storage.listBroadcasts({ status: "queued", limit: 1 });
    const broadcast = active ?? queued;
    if (!broadcast) return false;

    if (broadcast.status === "queued") {
      await storage.updateBroadcast(broadcast.id, {
        status: "sending",
        startedAt: new Date(),
      });
    }

    const pending = await storage.listPendingBroadcastLogs({
      broadcastId: broadcast.id,
      limit: batchSize,
      now: new Date(),
    });

    if (pending.length === 0) {
      const remaining = await storage.countPendingBroadcastLogs(broadcast.id);
      if (remaining === 0) {
        const finishedAt = new Date();
        const counts = await storage.countBroadcastLogs(broadcast.id);
        await storage.updateBroadcast(broadcast.id, {
          status: "completed",
          finishedAt,
          sentCount: counts.sent,
          failedCount: counts.failed,
        });
        if (broadcast.startedAt) {
          const durationSeconds =
            (finishedAt.getTime() - new Date(broadcast.startedAt).getTime()) / 1000;
          const throughput =
            durationSeconds > 0 ? counts.sent / durationSeconds : null;
          logJson("log", "broadcast.completed", {
            broadcastId: broadcast.id,
            correlationId: broadcast.correlationId,
            durationSeconds,
            throughput,
            sentCount: counts.sent,
            failedCount: counts.failed,
          });
        }
      }
      return false;
    }

    let sent = 0;
    let failed = 0;

    for (const logEntry of pending) {
      try {
        if (!logEntry.telegramId) {
          throw new Error("missing_telegram_id");
        }
        await sendBroadcastMessage(bot, broadcast, logEntry.telegramId || "");
        sent += 1;
        await storage.updateBroadcastLog(logEntry.id, {
          status: "sent",
          attempts: (logEntry.attempts ?? 0) + 1,
          lastErrorCode: null,
          lastErrorMessage: null,
          nextAttemptAt: null,
        });
      } catch (error: any) {
        const attempts = (logEntry.attempts ?? 0) + 1;
        const transient = isTransient(error);
        const permanent = isPermanent(error);
        const errorCode = extractErrorCode(error);
        const errorMessage = extractErrorMessage(error);

        if (errorCode === 429) {
          logJson("warn", "broadcast.rate_limited", {
            broadcastId: broadcast.id,
            correlationId: broadcast.correlationId,
            telegramId: logEntry.telegramId,
            errorCode,
            errorMessage,
            attempts,
          });
        } else if (!transient) {
          logJson("error", "broadcast.send_failed", {
            broadcastId: broadcast.id,
            correlationId: broadcast.correlationId,
            telegramId: logEntry.telegramId,
            errorCode,
            errorMessage,
            attempts,
          });
        }

        if (transient && attempts <= retryLimit) {
          const backoffMs = retryBaseMs * Math.pow(2, attempts - 1);
          await storage.updateBroadcastLog(logEntry.id, {
            status: "pending",
            attempts,
            lastErrorCode: errorCode ?? null,
            lastErrorMessage: errorMessage,
            nextAttemptAt: new Date(Date.now() + backoffMs),
          });
          continue;
        }

        failed += 1;
        await storage.updateBroadcastLog(logEntry.id, {
          status: "failed",
          attempts,
          lastErrorCode: errorCode ?? null,
          lastErrorMessage: errorMessage,
          nextAttemptAt: null,
        });

        if (permanent && logEntry.userId) {
          const telegramStatus = resolveTelegramStatus(error);
          if (telegramStatus) {
            await storage.updateUser(logEntry.userId, {
              telegramStatus,
            });
          }
        }
      }
    }

    const counts = await storage.countBroadcastLogs(broadcast.id);
    await storage.updateBroadcast(broadcast.id, {
      sentCount: counts.sent,
      failedCount: counts.failed,
    });

    const delayMs = Math.ceil((pending.length / ratePerSec) * 1000);
    await sleep(delayMs);
    return sent + failed > 0;
  };

  const processMessageQueue = async () => {
    const pending = await storage.listPendingMessages({
      limit: Math.min(batchSize, 100),
      now: new Date(),
    });
    if (pending.length === 0) return false;

    for (const entry of pending) {
      let payload: any;
      try {
        payload = JSON.parse(entry.payload);
      } catch {
        await storage.updateMessage(entry.id, {
          status: "failed",
          lastErrorMessage: "invalid_payload",
        });
        continue;
      }

      try {
        if (!entry.telegramId) {
          throw new Error("missing_telegram_id");
        }
        if (payload.type === "task_assignment") {
          await sendTaskMessage(
            bot,
            {
              assignmentId: payload.assignmentId,
              text: payload.text,
              webAppUrl: payload.webAppUrl || webAppUrl,
            },
            entry.telegramId || "",
          );
        } else {
          throw new Error("unknown_payload_type");
        }
        await storage.updateMessage(entry.id, {
          status: "sent",
          attempts: (entry.attempts ?? 0) + 1,
          lastErrorCode: null,
          lastErrorMessage: null,
          nextAttemptAt: null,
        });
      } catch (error: any) {
        const attempts = (entry.attempts ?? 0) + 1;
        const transient = isTransient(error);
        const permanent = isPermanent(error);
        const errorCode = extractErrorCode(error);
        const errorMessage = extractErrorMessage(error);

        if (errorCode === 429) {
          logJson("warn", "queue.rate_limited", {
            queueId: entry.id,
            telegramId: entry.telegramId,
            errorCode,
            errorMessage,
            attempts,
          });
        } else if (!transient) {
          logJson("error", "queue.send_failed", {
            queueId: entry.id,
            telegramId: entry.telegramId,
            errorCode,
            errorMessage,
            attempts,
          });
        }

        if (transient && attempts <= retryLimit) {
          const backoffMs = retryBaseMs * Math.pow(2, attempts - 1);
          await storage.updateMessage(entry.id, {
            status: "pending",
            attempts,
            lastErrorCode: errorCode ?? null,
            lastErrorMessage: errorMessage,
            nextAttemptAt: new Date(Date.now() + backoffMs),
          });
        } else {
          await storage.updateMessage(entry.id, {
            status: "failed",
            attempts,
            lastErrorCode: errorCode ?? null,
            lastErrorMessage: errorMessage,
            nextAttemptAt: null,
          });
        }

        if (permanent && entry.userId) {
          const telegramStatus = resolveTelegramStatus(error);
          if (telegramStatus) {
            await storage.updateUser(entry.userId, { telegramStatus });
          }
        }
      }
    }

    const delayMs = Math.ceil((pending.length / ratePerSec) * 1000);
    await sleep(delayMs);
    return true;
  };

  const loop = async () => {
    while (!stopped) {
      const didBroadcast = await processBroadcasts();
      const didQueue = await processMessageQueue();
      if (!didBroadcast && !didQueue) {
        await sleep(500);
      }
    }
  };

  loop().catch((error) => {
    logJson("error", "queue.worker_failed", {
      error: error instanceof Error ? error.message : String(error),
    });
  });

  return () => {
    stopped = true;
    logger.log("[queue] worker stopped");
  };
}
