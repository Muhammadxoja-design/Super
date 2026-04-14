import { Markup } from "../telegraf";
import { userRepository } from "../repositories/user.repository";
import { taskRepository } from "../repositories/task.repository";
import { assignmentRepository } from "../repositories/assignment.repository";
import { auditRepository } from "../repositories/audit.repository";
import { botService } from "../services/bot.service";
import { 
  ensureSubscriptionAccess, 
  ensureProAccess, 
  isTelegramAdmin, 
  ensureTelegramAdmin,
  formatAssignments,
  enqueueTaskNotification,
} from "../utils/bot-helpers";
import { 
  getStatusLabel, 
  mapLegacyStatus, 
  parseTaskStatusCallback 
} from "../task-status";
import { 
  isSuperAdminUser, 
  isAdminUser, 
  createAuditLog,
  isSuperAdminTelegramId,
} from "../utils/helpers";
import { type TaskAssignment, type Task, type User } from "@shared/schema";

// State management (previously local to registerRoutes)
export const adminTaskDrafts = new Map<number, { taskId: number; title: string; description?: string }>();
export const adminAwaitingTask = new Set<number>();
export const adminAwaitingRejectionReason = new Map<number, { userId: number; adminTelegramId: string }>();
export const awaitingStatusNote = new Map<number, { assignmentId: number; status: string }>();
export const awaitingDoneProof = new Map<number, { assignmentId: number }>();

export const startHandler = async (ctx: any, webAppUrl?: string) => {
  if (ctx.chat?.type !== "private") return;
  if (ctx.from) {
    const { clearSubscriptionCache } = await import("../subscription");
    clearSubscriptionCache(String(ctx.from.id));
  }
  if (!(await ensureSubscriptionAccess(ctx))) return;
  const message = "Assalomu alaykum! TaskBotFergana ga xush kelibsiz.";
  if (webAppUrl) {
    await ctx.reply(
      message,
      Markup.inlineKeyboard([
        Markup.button.webApp("📲 Web App ochish", webAppUrl),
      ]),
    );
  } else {
    await ctx.reply(message);
  }
};

export const registerHandler = async (ctx: any, webAppUrl?: string) => {
  if (!(await ensureSubscriptionAccess(ctx))) return;
  await ctx.reply(
    "Ro'yxatdan o'tish uchun telefon raqamingizni yuboring:",
    Markup.keyboard([Markup.button.contactRequest("📞 Kontaktni yuborish")])
      .oneTime()
      .resize(),
  );

  if (webAppUrl) {
    await ctx.reply(
      "Web ilovani ochish:",
      Markup.inlineKeyboard([
        Markup.button.webApp("📲 Web App ochish", webAppUrl),
      ]),
    );
  }
};

export const contactHandler = async (ctx: any) => {
  if (!(await ensureSubscriptionAccess(ctx))) return;
  const contact = ctx.message?.contact;
  if (!contact) return;
  if (!ctx.from || contact.user_id !== ctx.from.id) {
    await ctx.reply("Iltimos, o'zingizning kontaktingizni yuboring.");
    return;
  }
  const telegramId = String(ctx.from.id);
  try {
    await botService.handleContact(telegramId, contact.phone_number);
    await ctx.reply("Kontaktingiz saqlandi. Rahmat!");
  } catch (err) {
    await ctx.reply("Avval /start orqali botga kiring.");
  }
};

export const newTaskHandler = async (ctx: any) => {
  if (!(await ensureSubscriptionAccess(ctx))) return;
  if (!ctx.from || !(await isTelegramAdmin(String(ctx.from.id)))) {
    return ctx.reply("Bu buyruq faqat adminlar uchun.");
  }
  await ensureTelegramAdmin(ctx);
  adminAwaitingTask.add(ctx.from.id);
  await ctx.reply("Yangi buyruq matnini yuboring:");
};

export const assignHandler = async (ctx: any) => {
  if (!(await ensureSubscriptionAccess(ctx))) return;
  if (!ctx.from) return;
  if (!(await isTelegramAdmin(String(ctx.from.id)))) {
    return ctx.reply("Bu buyruq faqat adminlar uchun.");
  }
  const adminUser = await ensureTelegramAdmin(ctx);
  if (!adminUser) return;
  const parts = ctx.message?.text?.split(" ") || [];
  const userId = parseInt(parts[1] || "", 10);
  if (!userId) {
    return ctx.reply("Foydalanuvchi ID kiriting: /assign <user_id>");
  }
  const draft = adminTaskDrafts.get(ctx.from.id);
  if (!draft) {
    return ctx.reply("Avval /newtask orqali buyruq yarating.");
  }
  
  const assignment = await assignmentRepository.create({
    taskId: draft.taskId,
    userId,
    status: "ACTIVE",
  });
  
  await auditRepository.createAuditLog({
    actorId: adminUser.id,
    action: "task_assigned",
    targetType: "task_assignment",
    targetId: assignment.id,
    metadata: JSON.stringify({ via: "bot" }),
  });

  adminTaskDrafts.delete(ctx.from.id);
  await ctx.reply(`Buyruq yuborildi. Assignment #${assignment.id}`);

  const user = await userRepository.findById(userId);
  const task = await taskRepository.findById(draft.taskId);
  const { webAppUrl } = await import("../routes/index");
  await enqueueTaskNotification(
    assignment,
    user ?? undefined,
    task ?? undefined,
    null,
    adminUser.id,
    undefined,
    webAppUrl
  );
};

export const tasksHandler = async (ctx: any) => {
  if (!(await ensureSubscriptionAccess(ctx))) return;
  if (!(await ensureProAccess(ctx))) return;
  if (!ctx.from) return;
  const telegramUser = await userRepository.findByTelegramId(String(ctx.from.id));
  if (!telegramUser) {
    await ctx.reply("Avval /start orqali botga kiring.");
    return;
  }
  const assignments = await assignmentRepository.findByUserId(telegramUser.id);
  const grouped = assignments.reduce<Record<string, typeof assignments>>(
    (acc, item) => {
      const key = item.assignment.status;
      acc[key] = acc[key] || [];
      acc[key].push(item);
      return acc;
    },
    {},
  );
  const lines = [
    formatAssignments(getStatusLabel("ACTIVE"), grouped.ACTIVE || []),
    formatAssignments(getStatusLabel("WILL_DO"), grouped.WILL_DO || []),
    formatAssignments(getStatusLabel("PENDING"), grouped.PENDING || []),
    formatAssignments(getStatusLabel("DONE"), grouped.DONE || []),
    formatAssignments(getStatusLabel("CANNOT_DO"), grouped.CANNOT_DO || []),
  ];
  await ctx.reply(lines.join("\n\n"));
};

export const activeTasksHandler = async (ctx: any) => {
  if (!(await ensureSubscriptionAccess(ctx))) return;
  if (!(await ensureProAccess(ctx))) return;
  if (!ctx.from) return;
  const telegramUser = await userRepository.findByTelegramId(String(ctx.from.id));
  if (!telegramUser) {
    await ctx.reply("Avval /start orqali botga kiring.");
    return;
  }
  const assignments = await assignmentRepository.findByUserId(telegramUser.id, "ACTIVE");
  await ctx.reply(formatAssignments(getStatusLabel("ACTIVE"), assignments));
};

export const pendingTasksHandler = async (ctx: any) => {
  if (!(await ensureSubscriptionAccess(ctx))) return;
  if (!(await ensureProAccess(ctx))) return;
  if (!ctx.from) return;
  const telegramUser = await userRepository.findByTelegramId(String(ctx.from.id));
  if (!telegramUser) {
    await ctx.reply("Avval /start orqali botga kiring.");
    return;
  }
  const assignments = await assignmentRepository.findByUserId(telegramUser.id, "PENDING");
  await ctx.reply(formatAssignments(getStatusLabel("PENDING"), assignments));
};

export const doneTasksHandler = async (ctx: any) => {
  if (!(await ensureSubscriptionAccess(ctx))) return;
  if (!(await ensureProAccess(ctx))) return;
  if (!ctx.from) return;
  const telegramUser = await userRepository.findByTelegramId(String(ctx.from.id));
  if (!telegramUser) {
    await ctx.reply("Avval /start orqali botga kiring.");
    return;
  }
  const assignments = await assignmentRepository.findByUserId(telegramUser.id, "DONE");
  await ctx.reply(formatAssignments(getStatusLabel("DONE"), assignments));
};

export const helpHandler = async (ctx: any, helpText: string) => {
  await ctx.reply(helpText);
};

export const submitDoneProof = async (
  ctx: any,
  proof: { text?: string; fileId?: string; type?: string },
) => {
  if (!ctx.from) return;
  if (!(await ensureProAccess(ctx))) return;
  const pending = awaitingDoneProof.get(ctx.from.id);
  if (!pending) return;
  const proofText = proof.text?.trim();
  if (!proof.fileId && (!proofText || proofText.length < 5)) {
    await ctx.reply(
      "Dalil uchun kamida 5 ta belgidan iborat matn yoki rasm yuboring.",
    );
    return;
  }
  awaitingDoneProof.delete(ctx.from.id);
  const telegramUser = await userRepository.findByTelegramId(String(ctx.from.id));
  if (!telegramUser) {
    await ctx.reply("Foydalanuvchi topilmadi.");
    return;
  }
  
  await botService.submitProof(pending.assignmentId, telegramUser.id, {
    proofText: proofText || null,
    proofFileId: proof.fileId ?? null,
    proofType: proof.fileId ? proof.type || "photo" : null,
  });

  await ctx.reply("Dalil qabul qilindi. Status: Qildim ✅");
};

export const textHandler = async (ctx: any) => {
    if (!ctx.from) return;
    if (!(await ensureSubscriptionAccess(ctx))) return;
    const statusRequest = awaitingStatusNote.get(ctx.from.id);
    if (statusRequest) {
      if (!(await ensureProAccess(ctx))) return;
      awaitingStatusNote.delete(ctx.from.id);
      const note = ctx.message?.text?.trim();
      const telegramUser = await userRepository.findByTelegramId(String(ctx.from.id));
      if (!telegramUser) {
        await ctx.reply("Foydalanuvchi topilmadi.");
        return;
      }
      const assignment = await assignmentRepository.findById(statusRequest.assignmentId);
      if (!assignment) {
        await ctx.reply("Buyruq topilmadi.");
        return;
      }
      if (!isAdminUser(telegramUser) && assignment.userId !== telegramUser.id) {
        await ctx.reply("Ruxsat yo'q.");
        return;
      }
      
      const updated = await assignmentRepository.updateStatus(
        statusRequest.assignmentId,
        statusRequest.status as "ACTIVE" | "DONE" | "CANNOT_DO" | "PENDING" | "WILL_DO",
        note && note !== "/skip" ? note : undefined,
        telegramUser.id,
      );

      if (updated) {
        await auditRepository.createAuditLog({
          actorId: telegramUser.id,
          action: "task_status_updated",
          targetType: "task_assignment",
          targetId: updated.id,
          metadata: JSON.stringify({ status: updated.status as string, via: "bot" }),
        });
        
        const task = await taskRepository.findById(updated.taskId);
        const adminUser = task ? await userRepository.findById(task.createdByAdminId) : null;
        if (adminUser?.telegramId) {
          const when = new Date().toLocaleString("uz-UZ");
          const { runtimeBot } = await import("../routes/index");
          if (runtimeBot) {
            runtimeBot.telegram
              .sendMessage(
                adminUser.telegramId,
                `🟢 Status yangilandi\nBuyruq: ${task?.title}\nFoydalanuvchi: ${telegramUser.firstName || telegramUser.username || telegramUser.id}\nStatus: ${getStatusLabel(updated.status as any)}\nVaqt: ${when}`,
              )
              .catch(console.error);
          }
        }
        await ctx.reply(`Status: ${getStatusLabel(updated.status as any)} ✅`);
      }
      return;
    }
    if (awaitingDoneProof.has(ctx.from.id)) {
      await submitDoneProof(ctx, { text: ctx.message?.text || "" });
      return;
    }
    if (!(await isTelegramAdmin(String(ctx.from.id)))) return;
    const pendingReason = adminAwaitingRejectionReason.get(ctx.from.id);
    if (pendingReason) {
      const reason = ctx.message?.text?.trim();
      if (!reason) {
        await ctx.reply("Rad etish sababini yuboring.");
        return;
      }
      adminAwaitingRejectionReason.delete(ctx.from.id);
      const updatedUser = await userRepository.update(pendingReason.userId, {
        status: "rejected",
        rejectedAt: new Date(),
        rejectedBy: pendingReason.adminTelegramId,
        rejectionReason: reason,
      });
      const { runtimeBot } = await import("../routes/index");
      if (runtimeBot && updatedUser.telegramId) {
        runtimeBot.telegram
          .sendMessage(
            updatedUser.telegramId,
            `❌ Arizangiz rad etildi. Sabab: ${reason}`,
          )
          .catch(console.error);
      }
      await ctx.reply("Rad etish sababi saqlandi.");
      return;
    }
    if (!adminAwaitingTask.has(ctx.from.id)) return;

    adminAwaitingTask.delete(ctx.from.id);
    const adminUser = await ensureTelegramAdmin(ctx);
    if (!adminUser) return;

    const title = ctx.message?.text?.trim();
    if (!title) {
      return ctx.reply("Buyruq matnini yuboring.");
    }

    const task = await botService.createTaskFromBot(title, adminUser.id);
    adminTaskDrafts.set(ctx.from.id, { taskId: task.id, title });

    if (!isSuperAdminUser(adminUser)) {
      await ctx.reply("Buyruq yaratildi. /assign <user_id> orqali yuboring.");
      return;
    }

    const usersList = await userRepository.findByFilters({ limit: 8 });
    const buttons = usersList
      .map((user) =>
        Markup.button.callback(
          `${user.firstName || user.username || "User"} (#${user.id})`,
          `assign_user:${task.id}:${user.id}`,
        ),
      );
    const rows = buttons.map((btn) => [btn]);

    await ctx.reply(
      "Buyruq yaratildi. Kimga yuboramiz?",
      Markup.inlineKeyboard(rows),
    );
    await ctx.reply("Yoki /assign <user_id> buyrug'idan foydalaning.");
};

export const photoHandler = async (ctx: any) => {
    if (!ctx.from) return;
    if (!(await ensureSubscriptionAccess(ctx))) return;
    if (!awaitingDoneProof.has(ctx.from.id)) return;
    const photos = ctx.message?.photo || [];
    const best = photos[photos.length - 1];
    if (!best?.file_id) {
      await ctx.reply("Rasmni qayta yuboring.");
      return;
    }
    await submitDoneProof(ctx, {
      fileId: best.file_id,
      type: "photo",
      text: ctx.message?.caption,
    });
};

export const callbackQueryHandler = async (ctx: any) => {
    if (!(await ensureSubscriptionAccess(ctx))) return;
    const data = (ctx.callbackQuery as any)?.data as string | undefined;
    if (!data) return;

    if (
      data.startsWith("approve:") ||
      data.startsWith("reject:") ||
      data.startsWith("reject_reason:")
    ) {
      if (!ctx.from || !(await isTelegramAdmin(String(ctx.from.id)))) {
        await ctx.answerCbQuery("Bu amal faqat adminlar uchun.");
        return;
      }
    }

    const { runtimeBot } = await import("../routes/index");

    if (data.startsWith("approve:")) {
      const [, userIdRaw] = data.split(":");
      const userId = parseInt(userIdRaw, 10);
      if (!Number.isFinite(userId)) {
        await ctx.answerCbQuery("Noto'g'ri foydalanuvchi");
        return;
      }
      const adminTelegramId = String(ctx.from?.id);
      const user = await userRepository.update(userId, {
        status: "approved",
        approvedAt: new Date(),
        approvedBy: adminTelegramId,
        rejectionReason: null,
        rejectedAt: null,
        rejectedBy: null,
      });
      if (runtimeBot && user.telegramId) {
        runtimeBot.telegram
          .sendMessage(
            user.telegramId,
            "✅ Arizangiz tasdiqlandi. Endi platformadan foydalanishingiz mumkin.",
          )
          .catch(console.error);
      }
      await ctx.editMessageText("Tasdiqlandi");
      await ctx.answerCbQuery();
      return;
    }

    if (data.startsWith("reject:")) {
      const [, userIdRaw] = data.split(":");
      const userId = parseInt(userIdRaw, 10);
      if (!Number.isFinite(userId)) {
        await ctx.answerCbQuery("Noto'g'ri foydalanuvchi");
        return;
      }
      const adminTelegramId = String(ctx.from?.id);
      const user = await userRepository.update(userId, {
        status: "rejected",
        rejectedAt: new Date(),
        rejectedBy: adminTelegramId,
      });
      if (runtimeBot && user.telegramId) {
        runtimeBot.telegram
          .sendMessage(user.telegramId, "❌ Arizangiz rad etildi.")
          .catch(console.error);
      }
      await ctx.editMessageText("Rad etildi");
      await ctx.answerCbQuery();
      return;
    }

    if (data.startsWith("reject_reason:")) {
      const [, userIdRaw] = data.split(":");
      const userId = parseInt(userIdRaw, 10);
      if (!Number.isFinite(userId)) {
        await ctx.answerCbQuery("Noto'g'ri foydalanuvchi");
        return;
      }
      if (!ctx.from) return;
      adminAwaitingRejectionReason.set(ctx.from.id, {
        userId,
        adminTelegramId: String(ctx.from.id),
      });
      await ctx.answerCbQuery();
      await ctx.reply("Rad etish sababini yuboring.");
      return;
    }

    if (data.startsWith("assign_user:")) {
      const actor = ctx.from
        ? await userRepository.findByTelegramId(String(ctx.from.id))
        : null;
      if (!actor || !isSuperAdminUser(actor)) {
        await ctx.answerCbQuery("Ruxsat yo‘q");
        return;
      }
      const [, taskIdRaw, userIdRaw] = data.split(":");
      const taskId = parseInt(taskIdRaw, 10);
      const userId = parseInt(userIdRaw, 10);
      
      const assignment = await assignmentRepository.create({
        taskId,
        userId,
        status: "ACTIVE",
      });
      const adminUser = await ensureTelegramAdmin(ctx);
      
      await ctx.answerCbQuery("Buyruq yuborildi");
      await ctx.editMessageText("Buyruq yuborildi.");
      await auditRepository.createAuditLog({
        actorId: adminUser?.id ?? null,
        action: "task_assigned",
        targetType: "task_assignment",
        targetId: assignment.id,
        metadata: JSON.stringify({ via: "bot_inline" }),
      });

      const user = await userRepository.findById(userId);
      const task = await taskRepository.findById(taskId);
      const { webAppUrl } = await import("../routes/index");
      await enqueueTaskNotification(
        assignment,
        user ?? undefined,
        task ?? undefined,
        null,
        adminUser?.id,
        undefined,
        webAppUrl
      );
      return;
    }

    const parsed = parseTaskStatusCallback(data);
    if (parsed) {
      const { assignmentId, status } = parsed;

      const actorUser = ctx.from
        ? await userRepository.findByTelegramId(String(ctx.from.id))
        : null;
      const assignment = await assignmentRepository.findById(assignmentId);
      if (!assignment) {
        await ctx.answerCbQuery("Buyruq topilmadi");
        return;
      }
      if (!isAdminUser(actorUser) && assignment.userId !== actorUser?.id) {
        await ctx.answerCbQuery("Ruxsat yo'q");
        return;
      }
      if (!(await ensureProAccess(ctx))) {
        await ctx.answerCbQuery("PRO kerak");
        return;
      }

      const updated = await assignmentRepository.updateStatus(
        assignmentId,
        status,
        undefined,
        actorUser?.id ?? null,
      );
      
      if (status === "DONE") {
        if (ctx.from) {
          awaitingDoneProof.set(ctx.from.id, { assignmentId });
        }
        await ctx.answerCbQuery("Dalil yuboring");
        await ctx.reply(
          "Qildim dalili: kamida 5 ta belgi matn yoki rasm yuboring.",
        );
        return;
      }
      if (status === "CANNOT_DO") {
        if (ctx.from) {
          awaitingStatusNote.set(ctx.from.id, { assignmentId, status });
        }
        if (updated) {
          await auditRepository.createAuditLog({
            actorId: actorUser?.id ?? updated.userId,
            action: "task_status_updated",
            targetType: "task_assignment",
            targetId: updated.id,
            metadata: JSON.stringify({ status, via: "bot" }),
          });
        }
        await ctx.answerCbQuery("Sabab yozing yoki /skip yuboring");
        await ctx.reply(
          "Qila olmadim sababi (ixtiyoriy). /skip yuborsangiz bo'ladi.",
        );
        const message = ctx.callbackQuery?.message as any;
        const label = getStatusLabel(status);
        if (message?.text) {
          ctx
            .editMessageText(`${message.text}\n\nStatus: ${label}`)
            .catch(() => null);
        } else if (message?.caption) {
          ctx
            .editMessageCaption(`${message.caption}\n\nStatus: ${label}`)
            .catch(() => null);
        }
        return;
      }
      
      if (updated) {
        await ctx.answerCbQuery("Status yangilandi");
        await auditRepository.createAuditLog({
          actorId: actorUser?.id ?? updated.userId,
          action: "task_status_updated",
          targetType: "task_assignment",
          targetId: updated.id,
          metadata: JSON.stringify({ status, via: "bot" }),
        });

        const user = await userRepository.findById(updated.userId);
        const task = await taskRepository.findById(updated.taskId);
        if (user && task) {
          const adminUser = await userRepository.findById(task.createdByAdminId);
          const adminTelegramId = adminUser?.telegramId;
          if (adminTelegramId && runtimeBot) {
            const when = new Date().toLocaleString("uz-UZ");
            runtimeBot.telegram
              .sendMessage(
                adminTelegramId,
                `🟢 Status yangilandi\nBuyruq: ${task.title}\nFoydalanuvchi: ${user.firstName || user.username || user.id}\nStatus: ${getStatusLabel(status)}\nVaqt: ${when}`,
              )
              .catch(console.error);
          }
        }

        const message = ctx.callbackQuery?.message as any;
        const label = getStatusLabel(status);
        if (message?.text) {
          ctx
            .editMessageText(`${message.text}\n\nStatus: ${label}`)
            .catch(() => null);
        } else if (message?.caption) {
          ctx
            .editMessageCaption(`${message.caption}\n\nStatus: ${label}`)
            .catch(() => null);
        }
        ctx.reply(`Status: ${label} ✅`).catch(() => null);
      } else {
        await ctx.answerCbQuery("Status oldin yangilangan");
      }
    }
};
