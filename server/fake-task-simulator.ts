import { db } from "./db";
import { taskAssignments, users, tasks } from "@shared/schema";
import { eq, and, like, inArray, sql } from "drizzle-orm";

const MOCK_PROOFS = [
  "Assalomu alaykum, vazifani bajardim. Rasm va hisobotni yuboryapman.",
  "Topshiriq bajarildi, hammasi joyida.",
  "Xo'p bo'ladi, vazifani o'z vaqtida tugatdik. Rahmat!",
  "Buyruq ijro etildi.",
  "Assalomu alaykum. Vazifa boyicha hamma ishlar qilindi.",
  "Bajarildi ✅. Keyingi topshiriqlarni kutib qolaman.",
  "Farg'onadan salom, topshiriqni a'lo darajada bajardik!",
  "Hududimizda ushbu vazifa to'liq yakunlandi.",
  "Vazifa bo'yicha kerakli chora-tadbirlar ko'rildi va yakuniga yetkazildi.",
  "Ijro etildi. Rahmat.",
  "Qilingan ishlar boyicha malumotlarni kiritib qoydim, vazifa bajarildi.",
  "Hammasi kutilganidek bajarildi. Rahbariyatga rahmat.",
  "Topshiriq 100% bajarildi.",
  "Bajarib qoydik, tekshirib olishingiz mumkin."
];

export async function processFakeTaskAssignments() {
  try {
    // Find up to 5 active assignments for fake users
    // We use a small limit so it looks like gradual, random completions
    const pendingFakeAssignments = await db.select({
      assignmentId: taskAssignments.id,
      userId: users.id,
      telegramId: users.telegramId,
      taskId: tasks.id,
      title: tasks.title
    })
    .from(taskAssignments)
    .innerJoin(users, eq(taskAssignments.userId, users.id))
    .innerJoin(tasks, eq(taskAssignments.taskId, tasks.id))
    .where(
      and(
        like(users.telegramId, 'fake_%'),
        eq(taskAssignments.status, 'ACTIVE')
      )
    )
    .limit(5);

    if (pendingFakeAssignments.length === 0) {
      return false;
    }

    // Only process a subset randomly to simulate realistic staggered timing
    const toProcess = pendingFakeAssignments.filter(() => Math.random() > 0.4);

    for (const assignment of toProcess) {
      const proofText = MOCK_PROOFS[Math.floor(Math.random() * MOCK_PROOFS.length)];
      
      // We simulate an AI-like realistic response by injecting the task title optionally
      const finalProof = Math.random() > 0.5 
        ? proofText.replace("vazifa", `"${assignment.title}" vazifasi`) 
        : proofText;

      await db.update(taskAssignments)
        .set({
          status: 'DONE',
          proofText: finalProof,
          proofSubmittedAt: new Date(),
          statusUpdatedAt: new Date(),
          statusNote: 'Avtomatik tasdiqlandi (AI Simulyatsiya)'
        })
        .where(eq(taskAssignments.id, assignment.assignmentId));

      console.log(`[Fake Simulator] Completed task ${assignment.taskId} for user ${assignment.telegramId}`);
    }

    return toProcess.length > 0;
  } catch (error) {
    console.error("[Fake Simulator] Error processing fake tasks:", error);
    return false;
  }
}
