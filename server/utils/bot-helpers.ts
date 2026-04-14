import { userRepository } from "../repositories/user.repository";
import { queueRepository } from "../repositories/queue.repository";
import { type User, type TaskAssignment, type Task } from "@shared/schema";
import { 
  isSuperAdminUser, 
  isSuperAdminTelegramId,
  resolveUserStatus,
  resolveUserRole,
  isProActiveUser,
  buildSubscriptionKeyboard,
  getAdminIds,
  buildTaskMessageText,
} from "./helpers";
import { 
  REQUIRED_CHANNEL_IDS, 
  checkUserSubscribed,
} from "../subscription";
import { SUBSCRIPTION_BYPASS_SUPERADMIN } from "./constants";

export const ensureProAccess = async (ctx: any) => {
  const proRequired = process.env.PRO_REQUIRED === "true";
  if (!proRequired) return true;
  if (!ctx.from) return false;
  const user = await userRepository.findByTelegramId(String(ctx.from.id));
  if (!user) return false;
  if (isSuperAdminUser(user)) return true;
  if (!isProActiveUser(user)) {
    await ctx.reply("PRO foydalanuvchilar uchun. Admin bilan bog'laning.");
    return false;
  }
  return true;
};

const sendSubscriptionRequired = async (
  ctx: any,
  missingChannels?: any[],
  warning?: string,
) => {
  const missingList = missingChannels?.length
    ? missingChannels
        .map((channel, index) => {
          const link = channel.inviteLinkOrUsername;
          const label = channel.title || channel.id;
          return link
            ? `${index + 1}. ${label} — ${link}`
            : `${index + 1}. ${label}`;
        })
        .join("\n")
    : "";
  const warningLine = warning ? `\n\n⚠️ ${warning}` : "";
  const message = missingList
    ? `Kanal(lar)ga obuna bo‘ling:\n${missingList}${warningLine}`
    : `Kanal(lar)ga obuna bo‘ling.${warningLine}`;
  const keyboard = await buildSubscriptionKeyboard(missingChannels);
  await ctx.reply(message, keyboard ? keyboard : undefined);
};

export const ensureSubscriptionAccess = async (ctx: any) => {
  if (!ctx.from) return false;
  if (!REQUIRED_CHANNEL_IDS.length) return true;
  if (
    SUBSCRIPTION_BYPASS_SUPERADMIN &&
    isSuperAdminTelegramId(ctx.from.id)
  ) {
    return true;
  }
  const subscription = await checkUserSubscribed(String(ctx.from.id));
  if (!subscription.ok) {
    await sendSubscriptionRequired(
      ctx,
      subscription.missing,
      subscription.warning,
    );
    return false;
  }
  return true;
};

export async function enqueueAdminNotification(message: string) {
  if (!message.trim()) return;
  const adminIds = [...new Set(getAdminIds())];
  if (!adminIds.length) return;
  try {
    await Promise.all(
      adminIds.map(async (telegramId) => {
        const adminUser = await userRepository.findByTelegramId(String(telegramId));
        await queueRepository.enqueue({
          type: "admin_notification",
          userId: adminUser?.id ?? null,
          telegramId: String(telegramId),
          payload: JSON.stringify({
            type: "admin_notification",
            text: message,
          }),
        });
      }),
    );
  } catch (error) {
    console.error("Admin notification enqueue failed:", error);
  }
}

export async function getOrCreateTelegramUser(telegramUser: any) {
  const telegramId = String(telegramUser.id);
  let user = await userRepository.findByTelegramId(telegramId);

  const adminIds = getAdminIds();
  const isAdmin = adminIds.includes(telegramId);
  const isSuperAdmin = isSuperAdminTelegramId(telegramId);
  const role = isSuperAdmin
    ? "super_admin"
    : isAdmin
      ? "limited_admin"
      : "user";

  if (!user) {
    const status = resolveUserStatus({ isAdmin });
    user = await userRepository.create({
      telegramId,
      username: telegramUser.username || null,
      firstName: telegramUser.first_name || null,
      lastName: telegramUser.last_name || null,
      photoUrl: telegramUser.photo_url || null,
      isAdmin,
      role,
      status,
    });
    await enqueueAdminNotification(
      `🆕 Yangi user (Telegram)\nID: ${user.id}\nIsm: ${user.firstName || user.username || "Noma'lum"}\nStatus: ${user.status}`,
    );
  } else {
    const nextStatus = resolveUserStatus({
      isAdmin: user.isAdmin || isAdmin,
      currentStatus: user.status ?? null,
    });
    user = await userRepository.update(user.id, {
      username: telegramUser.username || user.username,
      firstName: telegramUser.first_name || user.firstName,
      lastName: telegramUser.last_name || user.lastName,
      photoUrl: telegramUser.photo_url || user.photoUrl,
      isAdmin: user.isAdmin || isAdmin,
      role: user.role && user.role !== "user" ? resolveUserRole(user) : role,
      status: nextStatus,
    });
  }

  return user;
}

export async function ensureTelegramAdmin(ctx: any) {
  if (!ctx.from) return null;
  const telegramId = String(ctx.from.id);
  let user = await userRepository.findByTelegramId(telegramId);
  if (!user) {
    user = await userRepository.create({
      telegramId,
      username: ctx.from.username || null,
      firstName: ctx.from.first_name || null,
      lastName: ctx.from.last_name || null,
      isAdmin: true,
      role: isSuperAdminTelegramId(telegramId)
        ? "super_admin"
        : "limited_admin",
      status: "approved",
    });
  }
  if (!user.isAdmin) {
    user = await userRepository.update(user.id, {
      isAdmin: true,
      role: isSuperAdminUser(user) ? "super_admin" : "limited_admin",
      status: "approved",
    });
  }
  return user;
}

export async function isTelegramAdmin(telegramId: string) {
  const adminIds = getAdminIds();
  if (adminIds.includes(telegramId)) return true;
  const user = await userRepository.findByTelegramId(telegramId);
  return Boolean(
    user?.isAdmin ||
    user?.role === "limited_admin" ||
    user?.role === "super_admin",
  );
}

export const formatAssignments = (
  label: string,
  items: Array<{ assignment: TaskAssignment; task: { title: string } }>,
) => {
  if (!items.length) return `${label}: 0`;
  const lines = items
    .slice(0, 10)
    .map((item, index) => `${index + 1}. ${item.task.title}`);
  const more = items.length > 10 ? `\n...yana ${items.length - 10} ta` : "";
  return `${label}: ${items.length}\n${lines.join("\n")}${more}`;
};

export async function enqueueTaskNotification(
  assignment: TaskAssignment,
  user: User | undefined,
  task: Task | undefined,
  templateBody?: string | null,
  adminUserId?: number,
  forwardMessageId?: number,
  webAppUrl?: string,
) {
  if (!user?.telegramId) return;
  const messageText = task
    ? buildTaskMessageText({
        template: templateBody,
        user,
        task,
      })
    : "Sizga buyruq keldi!";
  await queueRepository.enqueue({
    type: "task_assignment",
    userId: user.id,
    telegramId: user.telegramId,
    payload: JSON.stringify({
      type: "task_assignment",
      assignmentId: assignment.id,
      text: messageText,
      webAppUrl,
      adminUserId: adminUserId ?? null,
      forwardMessageId: forwardMessageId ?? null,
    }),
  });
}
