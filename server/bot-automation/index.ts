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

// 2. BullMQ Redis Connection (Using default local options since Redis is required)
const redisOptions = { host: "127.0.0.1", port: 6379 };

// Navbat tizimi (Jitter Queue Scheduler)
export const botActionQueue = new Queue("bot-action-queue", {
  connection: redisOptions
});

// 3. Jitter bilan ishlarni yuborish
export async function dispatchCommandToBots(assignments: { assignmentId: number, telegramId: string, taskTitle: string }[]) {
  const now = Date.now();

  for (const bot of assignments) {
    // 1 daqiqadan tortib 48 soatgacha masalan: Random Jitter Delay!
    const randomDelayMs = Math.floor(Math.random() * (48 * 60 * 60 * 1000));
    const executeAt = new Date(now + randomDelayMs);
    const fakeIp = `213.230.${Math.floor(Math.random() * 255)}.${Math.floor(Math.random() * 255)}`;

    // SQLite ga pending qilib zaxiraga yozamiz
    const actionId = crypto.randomUUID();
    localDb.prepare(
      `INSERT INTO action_logs (id, telegram_id, assignment_id, action_type, simulated_ip, execute_at, status) VALUES (?, ?, ?, ?, ?, ?, ?)`
    ).run(actionId, bot.telegramId, bot.assignmentId, bot.taskTitle, fakeIp, executeAt.toISOString(), 'pending');

    // BullMQ ni o'rniga aniq rejalashtiramiz
    await botActionQueue.add("execute_bot_action", {
      actionId,
      assignmentId: bot.assignmentId,
      telegramId: bot.telegramId,
      commandType: bot.taskTitle,
      ip: fakeIp
    }, {
      delay: randomDelayMs,
      attempts: 5,        // Xato bo'lsa DB larga yozish uchun yana urinadi
      backoff: { type: 'exponential', delay: 5000 }
    });

    console.log(`[Jitter Scheduled -> BullMQ] Bot ${bot.telegramId} vazifani kutmoqda (Kechikish: ${Math.round(randomDelayMs / 60000)} daqiqa).`);
  }
}

// Oflayn Shablonlar 
const FALLBACK_PROOFS = [
  "Zo'r, Farg'onadan salomlar, ishni bitirib qoydik",
  "Xop boladi admin, hamma yozgan ishizni qildm ✅",
  "Assalom aleykum vodiy ahli nomidan! Izoh yozdm tayyor",
  "Bo'ldi, bajardim! 💯",
  "Biram zor oylabsilareee, 100% bittii ✊🏻"
];

// 4. Rate-limited Worker (Queue Processor for Groq API limiter)
// Masalan 1 daqiqada faqat maxsus 20 ta task yurgiziladi
export const botWorker = new Worker("bot-action-queue", async (job) => {
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
      proofText = chatCompletion.choices[0]?.message?.content || FALLBACK_PROOFS[Math.floor(Math.random() * FALLBACK_PROOFS.length)];
    } else {
      proofText = FALLBACK_PROOFS[Math.floor(Math.random() * FALLBACK_PROOFS.length)];
    }
  } catch (error) {
    console.error("Groq Generation Error:", error);
    proofText = FALLBACK_PROOFS[Math.floor(Math.random() * FALLBACK_PROOFS.length)];
  }

  // Dual Sync 1: Supabase-ga jo'natish
  const { error: supabaseError } = await supabase.from('task_assignments')
    .update({
      status: 'DONE',
      proof_text: proofText,
      status_note: `AI Tasdiq (IP: ${data.ip})`
    })
    .eq('id', data.assignmentId);

  if (supabaseError) {
    // BullMQ ni xatolikka tortamiz, shunda retry qilib tarmoq o'chganda kutib turadi
    throw new Error(`Supabase Sync Failed! Re-queuing job ${job.id}: ` + supabaseError.message);
  }

  // Dual Sync 2: Mahalliy Local SQLite ni 'completed' qilib tozalab saqlash
  localDb.prepare(`UPDATE action_logs SET status = 'completed', proof_text = ? WHERE id = ?`).run(proofText, data.actionId);

  console.log(`[✅ Sync Success] Bot ${data.telegramId} izoh qoldirdi (IP: ${data.ip}) -> ${proofText}`);
}, {
  connection: redisOptions,
  limiter: { max: 20, duration: 60000 } // Groq Rate Limit uchun
});

// Start Worker Listeners
botWorker.on('failed', (job, err) => {
  console.warn(`[BullMQ] Job ${job?.id} failed with ${err.message}. It will be retried.`);
});

console.log("[Bot Automation] BullMQ Worker & Groq NLP Engine Initialized.");
