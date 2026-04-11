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
// 3. Jitter bilan ishlarni yuborish
// ────────────────────────────────────────────────────────────
export async function dispatchCommandToBots(
  assignments: {
    assignmentId: number;
    telegramId: string;
    taskTitle: string;
  }[]
) {
  const now = Date.now();

  let currentIndex = 0;
  const BATCH_FAST_COUNT = 30;

  for (const bot of assignments) {
    currentIndex++;
    
    let randomDelayMs = 0;
    let initialStatus = "ACTIVE";

    // First 30 people: fast execution (10 seconds to 5 minutes) -> ACTIVE
    if (currentIndex <= BATCH_FAST_COUNT) {
      randomDelayMs = Math.floor(Math.random() * 5 * 60 * 1000) + 10000;
      initialStatus = "ACTIVE";
    } else {
      // The rest: slow execution (30 minutes to 24 hours) -> PENDING (WILL_DO)
      randomDelayMs = Math.floor(Math.random() * 24 * 60 * 60 * 1000) + (30 * 60 * 1000);
      initialStatus = "WILL_DO";
    }

    const executeAt = new Date(now + randomDelayMs);
    const fakeIp = `213.230.${Math.floor(Math.random() * 255)}.${Math.floor(Math.random() * 255)}`;

    const actionId = crypto.randomUUID();

    // Async update to Supabase to reflect correct status in dashboard immediately
    supabase
      .from("task_assignments")
      .update({ status: initialStatus })
      .eq("id", bot.assignmentId)
      .then(({ error }) => {
        if (error) console.error("Initial Status Sync Error:", error);
      });

    // Always persist to SQLite
    localDb
      .prepare(
        `INSERT INTO action_logs (id, telegram_id, assignment_id, action_type, simulated_ip, execute_at, status)
         VALUES (?, ?, ?, ?, ?, ?, ?)`
      )
      .run(
        actionId,
        bot.telegramId,
        bot.assignmentId,
        bot.taskTitle,
        fakeIp,
        executeAt.toISOString(),
        "pending"
      );

    if (REDIS_AVAILABLE && botActionQueue) {
      // Queue in BullMQ only when Redis is available
      botActionQueue.add(
        "execute_bot_action",
        {
          actionId,
          assignmentId: bot.assignmentId,
          telegramId: bot.telegramId,
          commandType: bot.taskTitle,
          ip: fakeIp,
        },
        {
          delay: randomDelayMs,
          attempts: 5,
          backoff: { type: "exponential", delay: 5000 },
        }
      ).catch(err => console.error("BullMQ Queue Error:", err));
      
    } else {
      console.log(
        `[Jitter → SQLite] Bot ${bot.telegramId} saved as pending (${initialStatus})`
      );
    }
  }
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
