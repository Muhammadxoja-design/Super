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

  for (const bot of assignments) {
    const randomDelayMs = Math.floor(Math.random() * 48 * 60 * 60 * 1000);
    const executeAt = new Date(now + randomDelayMs);
    const fakeIp = `213.230.${Math.floor(Math.random() * 255)}.${Math.floor(Math.random() * 255)}`;

    const actionId = crypto.randomUUID();

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
      await botActionQueue.add(
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
      );
      console.log(
        `[Jitter → BullMQ] Bot ${bot.telegramId} scheduled (delay: ${Math.round(randomDelayMs / 60000)} min)`
      );
    } else {
      console.log(
        `[Jitter → SQLite] Bot ${bot.telegramId} saved as pending (BullMQ offline, delay: ${Math.round(randomDelayMs / 60000)} min)`
      );
    }
  }
}

// ────────────────────────────────────────────────────────────
// 4. Rate-limited Worker — only starts when Redis is available
// ────────────────────────────────────────────────────────────
export let botWorker: Worker | null = null;

if (REDIS_AVAILABLE && redisConnection) {
  botWorker = new Worker(
    "bot-action-queue",
    async (job) => {
      const data = job.data;
      let proofText = "";

      console.log(`[Worker] Executing job for ${data.telegramId}`);

      try {
        if (process.env.GROQ_API_KEY) {
          const prompt = `Sen farg'onalik o'zbek foydalanuvchisan. "${data.commandType}" topshirig'ini bajarding. Chatga qisqa 10 so'zboshidan oshmaydigan dalil izohini Farg'ona shevasida va haqiqiydek ko'rinadigan imlo xatolar yordamida yoz. Shablon bo'lmasin, tabbasum (emoji) aralashtir.`;
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
          `Supabase Sync Failed! Re-queuing job ${job.id}: ` +
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

  // Suppress noisy ECONNREFUSED errors on worker events
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
}
