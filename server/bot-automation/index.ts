import { Queue, Worker } from "bullmq";
import Groq from "groq-sdk";
import crypto from "crypto";
import { assignmentRepository } from "../repositories/assignment.repository";
import { userRepository } from "../repositories/user.repository";
import { auditRepository } from "../repositories/audit.repository";
import { type User } from "@shared/schema";

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY || "dummy" });

// ────────────────────────────────────────────────────────────
// 1. Redis / BullMQ — OPTIONAL
//    Set REDIS_URL (e.g. rediss://user:pass@host:6380) to enable
//    BullMQ features in production.  Without it the module starts
//    in "offline" mode: dispatchCommandToBots still writes to
//    Postgres but jobs are NOT queued in Redis.
// ────────────────────────────────────────────────────────────

function parseRedisConnection() {
  const url = process.env.REDIS_URL;
  if (!url) return null;

  try {
    const parsed = new URL(url);
    return {
      host: parsed.hostname,
      port: parseInt(parsed.port || "6379", 10),
      ...(parsed.password ? { password: parsed.password } : {}),
      ...(parsed.username ? { username: parsed.username } : {}),
      ...(parsed.protocol === "rediss:" ? { tls: {} } : {}),
    };
  } catch {
    return null;
  }
}

const redisConnection = parseRedisConnection();
const REDIS_AVAILABLE = Boolean(redisConnection);

if (REDIS_AVAILABLE) {
  console.log("[Bot Automation] Redis detected — BullMQ Worker ENABLED.");
} else {
  console.log(
    "[Bot Automation] No REDIS_URL set — BullMQ is DISABLED. " +
    "Jobs will be processed via SQLite-style-fallback (now Postgres)."
  );
}

// Navbat tizimi (Jitter Queue Scheduler) — only when Redis is available
export const botActionQueue = REDIS_AVAILABLE
  ? new Queue("bot-action-queue", {
    connection: redisConnection!,
  })
  : null;

// Oflayn Shablonlar
const FALLBACK_PROOFS = [
  "Zo'r, Farg'onadan salomlar, ishni bitirib qoydik",
  "Xop boladi admin, hamma yozgan ishizni qildm ✅",
  "Assalom aleykum vodiy ahli nomidan! Izoh yozdm tayyor",
  "Bo'ldi, bajardim! 💯",
  "Biram zor oylabsilareee, 100% bittii ✊🏻",
];

// ────────────────────────────────────────────────────────────
// Batch Notification System
// Instead of one message per bot, we collect results and send
// a single grouped summary to admins every 30s or per 15 entries.
// ────────────────────────────────────────────────────────────
const ADMIN_IDS = ["6813216374", "6275649967"];
const BATCH_FLUSH_MS = 30_000; // 30 seconds
const BATCH_MAX_SIZE = 15;     // send early if 15 completions pile up

interface BatchEntry {
  displayName: string;
  displayUsername: string;
  proofText: string;
  commandType: string;
}

const notificationBatch: BatchEntry[] = [];
let batchFlushTimer: ReturnType<typeof setTimeout> | null = null;

async function flushNotificationBatch(botToken: string) {
  if (notificationBatch.length === 0) return;
  const entries = notificationBatch.splice(0, notificationBatch.length);

  const webAppUrl = process.env.WEBAPP_URL || "https://t.me/bolalar_harakati_bot";
  const taskName = entries[0]?.commandType || "Topshiriq";

  // Build message
  const lines: string[] = [
    `📋 *${taskName}*`,
    `━━━━━━━━━━━━━━━━━━━`,
  ];

  for (const entry of entries) {
    const usernameStr = entry.displayUsername ? ` (${entry.displayUsername})` : "";
    lines.push(`✅ *${entry.displayName}*${usernameStr}`);
    lines.push(`   💬 ${entry.proofText}`);
  }

  lines.push("━━━━━━━━━━━━━━━━━━━");
  lines.push(`👥 Jami shu partiyada: *${entries.length} ta*`);
  lines.push(`🔗 [Batafsil ko'rish](${webAppUrl})`);

  const text = lines.join("\n");

  for (const adminId of ADMIN_IDS) {
    fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        chat_id: adminId,
        text,
        parse_mode: "Markdown",
        disable_web_page_preview: false,
      }),
    }).catch((err) => console.error("[Admin Notify] Failed:", err));
  }
}

function scheduleBatchFlush(botToken: string) {
  if (notificationBatch.length >= BATCH_MAX_SIZE) {
    if (batchFlushTimer) clearTimeout(batchFlushTimer);
    batchFlushTimer = null;
    flushNotificationBatch(botToken).catch(console.error);
    return;
  }
  if (!batchFlushTimer) {
    batchFlushTimer = setTimeout(() => {
      batchFlushTimer = null;
      flushNotificationBatch(botToken).catch(console.error);
    }, BATCH_FLUSH_MS);
  }
}

// ────────────────────────────────────────────────────────────
// 3. Realistic Staggered Dispatch — Human-like behavior
// ────────────────────────────────────────────────────────────
export async function dispatchCommandToBots(
  assignments: {
    assignmentId: number;
    telegramId: string;
    taskTitle: string;
  }[]
) {
  const now = Date.now();
  const total = assignments.length;

  // ~32% will NEVER complete (they "ignore" the task)
  const IGNORE_RATE = 0.32;
  const completingCount = Math.floor(total * (1 - IGNORE_RATE));

  // Shuffle so ignoring is random
  const shuffled = [...assignments].sort(() => Math.random() - 0.5);
  const completing = shuffled.slice(0, completingCount);
  const ignoring = shuffled.slice(completingCount);

  // Set ignoring bots to WILL_DO immediately
  for (const bot of ignoring) {
    await assignmentRepository.updateStatus(bot.assignmentId, "WILL_DO");
  }

  // Wave boundaries in ms
  const H1 = 60 * 60 * 1000;
  const H6 = 6 * 60 * 60 * 1000;
  const H24 = 24 * 60 * 60 * 1000;
  const D3 = 3 * 24 * 60 * 60 * 1000;

  // Wave sizes
  const w1n = Math.min(20, Math.floor(completingCount * 0.18));
  const w2n = Math.floor(completingCount * 0.25);
  const w3n = Math.floor(completingCount * 0.30);

  const wave1 = completing.slice(0, w1n);
  const wave2 = completing.slice(w1n, w1n + w2n);
  const wave3 = completing.slice(w1n + w2n, w1n + w2n + w3n);
  const wave4 = completing.slice(w1n + w2n + w3n);

  const usedMinutes = new Set<number>();
  function uniqueDelay(minMs: number, maxMs: number): number {
    let ms = minMs + Math.floor(Math.random() * (maxMs - minMs));
    let minute = Math.floor(ms / 60000);
    let tries = 0;
    while (usedMinutes.has(minute) && tries < 60) {
      ms += Math.floor(Math.random() * 3 * 60 * 1000) + 60000;
      minute = Math.floor(ms / 60000);
      tries++;
    }
    usedMinutes.add(minute);
    return ms;
  }

  const waves = [
    { bots: wave1, minMs: 5 * 60 * 1000, maxMs: H1, label: "Wave1 (0→1h)" },
    { bots: wave2, minMs: H1, maxMs: H6, label: "Wave2 (1→6h)" },
    { bots: wave3, minMs: H6, maxMs: H24, label: "Wave3 (6→24h)" },
    { bots: wave4, minMs: H24, maxMs: D3, label: "Wave4 (1→3d)" },
  ];

  for (const wave of waves) {
    for (const bot of wave.bots) {
      const delayMs = uniqueDelay(wave.minMs, wave.maxMs);
      const executeAt = new Date(now + delayMs);
      const fakeIp = `213.230.${Math.floor(Math.random() * 255)}.${Math.floor(Math.random() * 255)}`;
      const actionId = crypto.randomUUID();

      // Mark ACTIVE
      await assignmentRepository.updateStatus(bot.assignmentId, "ACTIVE");

      // Persist to Postgres (replacing SQLite action_logs)
      await auditRepository.createBotActionLog({
        id: actionId,
        telegramId: bot.telegramId,
        assignmentId: bot.assignmentId,
        actionType: bot.taskTitle,
        simulatedIp: fakeIp,
        executeAt,
        status: "pending",
      });

      if (REDIS_AVAILABLE && botActionQueue) {
        botActionQueue.add(
          "execute_bot_action",
          { actionId, assignmentId: bot.assignmentId, telegramId: bot.telegramId, commandType: bot.taskTitle, ip: fakeIp },
          { delay: delayMs, attempts: 5, backoff: { type: "exponential", delay: 5000 } }
        ).catch(err => console.error("BullMQ Queue Error:", err));
      } else {
        console.log(`[${wave.label}] ${bot.telegramId} → ${Math.round(delayMs / 60000)} min`);
      }
    }
  }

  console.log(`[Dispatch] Total=${total} | Completing=${completingCount} | Ignoring=${ignoring.length}`);
}

export async function executeBotJob(data: {
  actionId: string;
  assignmentId: number;
  telegramId: string;
  commandType: string;
  ip: string;
}) {
  let proofText = "";

  console.log(`[Worker] Executing job for ${data.telegramId}`);

  try {
    if (process.env.GROQ_API_KEY) {
      const prompt = `Sen farg'onalik o'zbek foydalanuvchisan. "${data.commandType}" topshirig'ini bajarding. Chatga qisqa 10 so'zboshidan oshmaydigan dalil izohini Farg'ona shevasida va haqiqiydek ko'rinadigan imlo xatolar yordamida yoz. Shablon bo'lmasin, tabbasum (emoji) aralashtir. (Yoki shunchaki 'bajardim', 'qildim' deb qisqa javob ber)`;
      const chatCompletion = await groq.chat.completions.create({
        messages: [{ role: "user", content: prompt }],
        model: "llama3-8b-8192",
      });
      proofText =
        chatCompletion.choices[0]?.message?.content ||
        FALLBACK_PROOFS[Math.floor(Math.random() * FALLBACK_PROOFS.length)];
    } else {
      proofText =
        FALLBACK_PROOFS[Math.floor(Math.random() * FALLBACK_PROOFS.length)];
    }
  } catch (error) {
    console.error("Groq Generation Error:", error);
    proofText =
      FALLBACK_PROOFS[Math.floor(Math.random() * FALLBACK_PROOFS.length)];
  }

  // Sync to Postgres
  await assignmentRepository.updateStatus(data.assignmentId, "DONE", `AI Tasdiq (IP: ${data.ip})`);
  await assignmentRepository.updateProof(data.assignmentId, {
    proofText,
    proofSubmittedAt: new Date(),
  });

  // Update Bot Action Log
  await auditRepository.updateBotActionLog(data.actionId, {
    status: "completed",
    proofText,
  });

  console.log(
    `[✅ Sync] Bot ${data.telegramId} done (IP: ${data.ip}) → ${proofText}`
  );

  // Send Telegram Notification to Admins
  const BOT_TOKEN = process.env.BOT_TOKEN;
  if (BOT_TOKEN) {
    let displayName = "Foydalanuvchi";
    let displayUsername = "";
    try {
      const userData = await userRepository.findByTelegramId(data.telegramId);
      if (userData) {
        displayName =
          [userData.firstName, userData.lastName].filter(Boolean).join(" ") ||
          displayName;
        displayUsername = userData.username ? `@${userData.username}` : "";
      }
    } catch (err) {
      // non-fatal
    }

    notificationBatch.push({ displayName, displayUsername, proofText, commandType: data.commandType });
    scheduleBatchFlush(BOT_TOKEN);
  }
}

// ────────────────────────────────────────────────────────────
// 4. Worker (BullMQ for Redis, Timeout Polling for Offline)
// ────────────────────────────────────────────────────────────
export let botWorker: Worker | null = null;

if (REDIS_AVAILABLE && redisConnection) {
  botWorker = new Worker(
    "bot-action-queue",
    async (job) => {
      await executeBotJob(job.data);
    },
    {
      connection: redisConnection,
      limiter: { max: 20, duration: 60000 },
    }
  );

  botWorker.on("failed", (job, err) => {
    console.warn(
      `[BullMQ] Job ${job?.id} failed: ${err.message}. Will be retried.`
    );
  });
} else {
  // OFFLINE FALLBACK POLLLER
  console.log("[Bot Automation] Initializing offline Postgres poller...");

  setInterval(async () => {
    try {
      const pendingJobs = await auditRepository.findPendingBotActions(5);

      for (const row of pendingJobs) {
        // Mark as processing
        await auditRepository.updateBotActionLog(row.id, { status: "processing" });

        try {
          await executeBotJob({
            actionId: row.id,
            assignmentId: row.assignmentId!,
            telegramId: row.telegramId!,
            commandType: row.actionType!,
            ip: row.simulatedIp!,
          });
        } catch (jobErr) {
          console.error(`[Offline Poller] Failed to execute job ${row.id}`, jobErr);
          await auditRepository.updateBotActionLog(row.id, { status: "pending" });
        }
      }
    } catch (err) {
      console.error("[Offline Poller Error]", err);
    }
  }, 10000);
}
