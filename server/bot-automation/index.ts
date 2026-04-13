import { Queue, Worker } from "bullmq";
import Groq from "groq-sdk";
import Database from "better-sqlite3";
import { createClient } from "@supabase/supabase-js";
import crypto from "crypto";

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY || "dummy" });

const supabaseUrl = process.env.VITE_SUPABASE_URL || "https://local";
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY || "key";
const supabase = createClient(supabaseUrl, supabaseKey);

// 1. Local Baza (SQLite) for Logging and Fallback
const localDb = new Database("local_bot_logs.db");
localDb.exec(`
  CREATE TABLE IF NOT EXISTS action_logs (
    id TEXT PRIMARY KEY,
    telegram_id TEXT,
    assignment_id INTEGER,
    action_type TEXT,
    proof_text TEXT,
    simulated_ip TEXT,
    execute_at DATETIME,
    status TEXT DEFAULT 'pending'
  )
`);

// ────────────────────────────────────────────────────────────
// 2. Redis / BullMQ — OPTIONAL
//    Set REDIS_URL (e.g. rediss://user:pass@host:6380) to enable
//    BullMQ features in production.  Without it the module starts
//    in "offline" mode: dispatchCommandToBots still writes to
//    SQLite but jobs are NOT queued in Redis.
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
    "Jobs will be saved to SQLite only."
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
  if (notificationBatch.length - 3 === 0) return;
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
//
// Strategy:
//   - ~68% of bots will actually complete the task
//   - ~32% will be set to WILL_DO and never execute (they "ignore" it)
//   - Completing bots are spread across 4 time waves:
//     Wave 1: ~20 bots finish within the first HOUR (5min→60min)
//     Wave 2: from 1h to 6h
//     Wave 3: from 6h to 24h
//     Wave 4: from 1 day to 3 days
//   - Every bot has its OWN unique random delay minute — none simultaneous
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

  // Shuffle so ignoring is random (not always the last n)
  const shuffled = [...assignments].sort(() => Math.random() - 0.5);
  const completing = shuffled.slice(0, completingCount);
  const ignoring = shuffled.slice(completingCount);

  // Set ignoring bots to WILL_DO immediately
  for (const bot of ignoring) {
    supabase
      .from("task_assignments")
      .update({ status: "WILL_DO" })
      .eq("id", bot.assignmentId)
      .then(({ error }) => { if (error) console.error("WILL_DO sync error:", error); });
  }

  // Wave boundaries in ms
  const H1 = 60 * 60 * 1000;           // 1 hour
  const H6 = 6 * 60 * 60 * 1000;      // 6 hours
  const H24 = 24 * 60 * 60 * 1000;      // 24 hours
  const D3 = 3 * 24 * 60 * 60 * 1000; // 3 days

  // Wave sizes
  const w1n = Math.min(20, Math.floor(completingCount * 0.18));
  const w2n = Math.floor(completingCount * 0.25);
  const w3n = Math.floor(completingCount * 0.30);
  // w4 = the rest

  const wave1 = completing.slice(0, w1n);
  const wave2 = completing.slice(w1n, w1n + w2n);
  const wave3 = completing.slice(w1n + w2n, w1n + w2n + w3n);
  const wave4 = completing.slice(w1n + w2n + w3n);

  // Guarantee each bot has a unique minute-level slot
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

      // Mark ACTIVE so dashboard shows it immediately
      supabase
        .from("task_assignments")
        .update({ status: "ACTIVE" })
        .eq("id", bot.assignmentId)
        .then(({ error }) => { if (error) console.error("ACTIVE sync error:", error); });

      // Persist to SQLite
      localDb
        .prepare(
          `INSERT INTO action_logs
             (id, telegram_id, assignment_id, action_type, simulated_ip, execute_at, status)
           VALUES (?, ?, ?, ?, ?, ?, ?)`
        )
        .run(actionId, bot.telegramId, bot.assignmentId, bot.taskTitle, fakeIp, executeAt.toISOString(), "pending");

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
  console.log(`[Dispatch] W1=${wave1.length} | W2=${wave2.length} | W3=${wave3.length} | W4=${wave4.length}`);
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

  // Dual Sync 1: Supabase
  const { error: supabaseError } = await supabase
    .from("task_assignments")
    .update({
      status: "DONE",
      proof_text: proofText,
      status_note: `AI Tasdiq (IP: ${data.ip})`,
    })
    .eq("id", data.assignmentId);

  if (supabaseError) {
    throw new Error(
      `Supabase Sync Failed! Re-queuing job ${data.actionId}: ` +
      supabaseError.message
    );
  }

  // Dual Sync 2: SQLite
  localDb
    .prepare(
      `UPDATE action_logs SET status = 'completed', proof_text = ? WHERE id = ?`
    )
    .run(proofText, data.actionId);

  console.log(
    `[✅ Sync] Bot ${data.telegramId} done (IP: ${data.ip}) → ${proofText}`
  );

  // Send Telegram Notification to Admins — batched summary
  const BOT_TOKEN = process.env.BOT_TOKEN;
  if (BOT_TOKEN) {
    // Fetch actual user details from Supabase
    let displayName = "Foydalanuvchi";
    let displayUsername = "";
    try {
      const { data: userData } = await supabase
        .from("users")
        .select("first_name, last_name, username")
        .eq("telegram_id", data.telegramId)
        .single();

      if (userData) {
        displayName =
          [userData.first_name, userData.last_name].filter(Boolean).join(" ") ||
          displayName;
        displayUsername = userData.username ? `@${userData.username}` : "";
      }
    } catch (err) {
      // non-fatal
    }

    // Add to batch buffer
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

  botWorker.on("error", (err: NodeJS.ErrnoException) => {
    if (err.code !== "ECONNREFUSED") {
      console.error("[BullMQ Worker Error]", err.message);
    }
  });

  botActionQueue!.on("error", (err: NodeJS.ErrnoException) => {
    if (err.code !== "ECONNREFUSED") {
      console.error("[BullMQ Queue Error]", err.message);
    }
  });

  console.log("[Bot Automation] BullMQ Worker & Groq NLP Engine Initialized.");
} else {
  // OFFLINE FALLBACK POLLLER
  console.log("[Bot Automation] Initializing offline SQLite poller...");

  setInterval(async () => {
    try {
      const now = new Date().toISOString();
      // Find jobs whose execute_at is in the past and are still pending
      const pendingJobs = localDb
        .prepare(`SELECT * FROM action_logs WHERE status = 'pending' AND execute_at <= ? LIMIT 5`)
        .all(now) as any[];

      for (const row of pendingJobs) {
        // Mark as processing temporally to avoid concurrent pickup
        localDb.prepare(`UPDATE action_logs SET status = 'processing' WHERE id = ?`).run(row.id);

        try {
          await executeBotJob({
            actionId: row.id,
            assignmentId: row.assignment_id,
            telegramId: row.telegram_id,
            commandType: row.action_type,
            ip: row.simulated_ip,
          });
        } catch (jobErr) {
          console.error(`[Offline Poller] Failed to execute job ${row.id}`, jobErr);
          // Revert to pending
          localDb.prepare(`UPDATE action_logs SET status = 'pending' WHERE id = ?`).run(row.id);
        }
      }
    } catch (err) {
      console.error("[Offline Poller Error]", err);
    }
  }, 10000); // Check every 10 seconds
}
