import { Request, Response } from "express";
import { api } from "@shared/routes";
import { z } from "zod";
import { userRepository } from "../repositories/user.repository";
import { taskRepository } from "../repositories/task.repository";
import { assignmentRepository } from "../repositories/assignment.repository";
import { auditRepository } from "../repositories/audit.repository";
import { templateRepository } from "../repositories/template.repository";
import { broadcastRepository } from "../repositories/broadcast.repository";
import { billingRepository } from "../repositories/billing.repository";
import { userService } from "../services/user.service";
import { taskService } from "../services/task.service";
import { adminService } from "../services/admin.service";
import { broadcastService } from "../services/broadcast.service";
import { type User, type TaskAssignment } from "@shared/schema";
import { 
  isAdminUser, 
  isSuperAdminUser, 
  createAuditLog, 
  parseDateFilter,
  logValidationFailure,
  formatBroadcastAttribution,
  buildBroadcastPreviewPayload,
 } from "../utils/helpers";

export const listUsers = async (req: Request, res: Response) => {
    try {
      const actor = (req as any).user as User;
      const filters = api.admin.users.list.input?.parse(req.query);
      const queryValue = filters?.query ?? filters?.q ?? filters?.search;
      if (!isAdminUser(actor)) {
        return res.status(403).json({
          message: "Ruxsat yo'q",
          code: "USERS_LIST_FORBIDDEN",
        });
      }
      const pageSize = filters?.pageSize ?? filters?.limit ?? 20;
      const page =
        filters?.page ??
        (filters?.offset !== undefined
          ? Math.floor(filters.offset / pageSize) + 1
          : 1);

      const result = await userRepository.findByFilters({
        search: queryValue,
        status: filters?.status,
        region: filters?.region,
        district: filters?.district,
        viloyat: filters?.viloyat,
        tuman: filters?.tuman,
        shahar: filters?.shahar,
        mahalla: filters?.mahalla,
        direction: filters?.direction,
        limit: pageSize,
        offset: (page - 1) * pageSize,
      });

      const total = await userRepository.countByFilters({
        search: queryValue,
        status: filters?.status,
        region: filters?.region,
        district: filters?.district,
      });

      res.json({ users: result, total, page, pageSize });
    } catch (err) {
      if (err instanceof z.ZodError) {
        return res.status(400).json({
          message: err.errors[0].message,
          code: "VALIDATION_ERROR",
        });
      }
      console.error("Admin users list error:", err);
      res.status(500).json({
        message: "Failed to fetch users",
        code: "USERS_LIST_FAILED",
      });
    }
};

export const searchUsers = async (req: Request, res: Response) => {
    try {
      const filters = api.admin.users.search.input?.parse(req.query);
      const queryValue = filters?.query ?? filters?.q;
      const result = await userRepository.findByFilters({
        search: queryValue,
        status: filters?.status,
        viloyat: filters?.viloyat,
        tuman: filters?.tuman,
        shahar: filters?.shahar,
        mahalla: filters?.mahalla,
        direction: filters?.direction,
        limit: filters?.pageSize ?? filters?.limit,
        offset: filters?.page ? (filters.page - 1) * (filters.pageSize ?? 20) : undefined,
      });
      res.json(result);
    } catch (err) {
      if (err instanceof z.ZodError) {
        return res.status(400).json({
          message: err.errors[0].message,
          code: "VALIDATION_ERROR",
        });
      }
      console.error("Admin users search error:", err);
      res.status(500).json({
        message: "Failed to search users",
        code: "USERS_SEARCH_FAILED",
      });
    }
};

export const updateUserStatusByAdmin = async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const input = api.admin.users.updateStatus.input.parse(req.body);
      const actor = (req as any).user;
      const user = await userService.updateUserStatus(
        parseInt(id as string, 10),
        actor.id,
        input.status,
        input.rejectionReason,
      );
      
      const { runtimeBot } = await import("../routes/index");
      if (runtimeBot && user.telegramId) {
        const message =
          input.status === "approved"
            ? "✅ Arizangiz tasdiqlandi. Endi platformadan foydalanishingiz mumkin."
            : input.status === "rejected"
              ? `❌ Arizangiz rad etildi. Sabab: ${input.rejectionReason || "ko'rsatilmagan"}`
              : "🟡 Arizangiz ko'rib chiqilmoqda.";
        runtimeBot.telegram
          .sendMessage(user.telegramId, message)
          .catch(console.error);
      }
      res.json(user);
    } catch (err) {
      if (err instanceof z.ZodError) {
        return res.status(400).json({ message: err.errors[0].message });
      }
      console.error("Update user status error:", err);
      res.status(500).json({ message: "Failed to update user status" });
    }
};

export const createAdminTask = async (req: Request, res: Response) => {
    try {
      const input = api.admin.tasks.create.input.parse(req.body);
      const user = (req as any).user as User;
      const task = await taskService.createTask(input, user.id);
      res.status(201).json(task);
    } catch (err) {
      if (err instanceof z.ZodError) {
        return res.status(400).json({ message: err.errors[0].message });
      }
      console.error("Create task error:", err);
      res.status(500).json({ message: "Failed to create task" });
    }
};

export const previewTaskTarget = async (req: Request, res: Response) => {
    let input: z.infer<typeof api.admin.tasks.previewTarget.input>;
    try {
      input = api.admin.tasks.previewTarget.input.parse(req.body);
    } catch (err) {
      if (err instanceof z.ZodError) {
        logValidationFailure(
          "POST /api/admin/tasks/preview-target",
          req.body,
          err,
        );
        return res
          .status(400)
          .json({ message: err.errors[0]?.message || "Invalid payload" });
      }
      throw err;
    }
    const { targetType, targetValue, userId } = input;
    const actor = (req as any).user as User;
    if (targetType === "ALL" && !isSuperAdminUser(actor)) {
      return res.status(403).json({ message: "Forbidden" });
    }

    const resolvedTargetValue =
      targetType === "USER"
        ? (userId ?? targetValue)
        : typeof targetValue === "string"
          ? targetValue.trim()
          : targetValue;
    if (
      targetType !== "ALL" &&
      (resolvedTargetValue === undefined || resolvedTargetValue === null)
    ) {
      return res.status(400).json({ message: "Target value required" });
    }

    const filters: any = { status: "approved" };
    if (targetType !== "ALL") {
      filters[targetType.toLowerCase()] = resolvedTargetValue;
    }

    const count = await userRepository.countByFilters(filters);
    const sample = await userRepository.findByFilters({
      ...filters,
      limit: 5,
    });

    return res.json({
      count,
      sample,
    });
};

export const assignTaskByAdmin = async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const input = api.admin.tasks.assign.input.parse(req.body);
      const actor = (req as any).user as User;
      const { webAppUrl } = await import("../routes/index");
      
      const result = await adminService.assignTaskBulk(
        parseInt(id as string, 10),
        input,
        actor,
        webAppUrl
      );

      return res.status(201).json(result);
    } catch (err: any) {
      if (err instanceof z.ZodError) {
        logValidationFailure(
          "POST /api/admin/tasks/:id/assign",
          req.body,
          err,
        );
        return res.status(400).json({ message: err.errors[0].message });
      }
      console.error("Assign task error:", err);
      return res.status(500).json({ message: err.message || "Failed to assign task" });
    }
};

export const listAdminTasks = async (req: Request, res: Response) => {
    const filters = api.admin.tasks.list.input.parse(req.query);
    const tasksWithAssignments = await assignmentRepository.findTasksWithAssignments({
      status: filters.status,
      search: filters.search,
      limit: filters.limit,
      offset: filters.offset,
    });

    const flatAssignments: TaskAssignment[] = [];
    tasksWithAssignments.forEach((entry) => {
      entry.assignments.forEach((item) =>
        flatAssignments.push(item.assignment),
      );
    });

    const stats = flatAssignments.reduce(
      (acc, assignment) => {
        acc.total += 1;
        switch (assignment.status) {
          case "DONE":
            acc.done += 1;
            break;
          case "WILL_DO":
            acc.willDo += 1;
            break;
          case "CANNOT_DO":
            acc.cannotDo += 1;
            break;
          case "PENDING":
            acc.pending += 1;
            break;
          default:
            acc.active += 1;
            break;
        }
        return acc;
      },
      {
        total: 0,
        done: 0,
        willDo: 0,
        cannotDo: 0,
        pending: 0,
        active: 0,
      },
    );

    const completionRate = stats.total
      ? Math.round((stats.done / stats.total) * 100)
      : 0;

    res.json({
      tasks: tasksWithAssignments,
      stats: { ...stats, completionRate },
    });
};

export const listAuditLogs = async (req: Request, res: Response) => {
    const logs = await auditRepository.findAllAuditLogs();
    const user = (req as any).user as User | undefined;
    const filtered = isSuperAdminUser(user)
      ? logs
      : logs.filter((log) => !String(log.action).startsWith("billing_"));
    res.json(filtered);
};

export const listTemplates = async (_req: Request, res: Response) => {
    const templates = await templateRepository.findAll();
    res.json(templates);
};

export const createTemplate = async (req: Request, res: Response) => {
    const input = api.admin.templates.create.input.parse(req.body);
    const actor = (req as any).user as User;
    const template = await templateRepository.create({
      title: input.title ?? null,
      body: input.body,
      isActive: input.isActive ?? true,
      createdBy: actor.id,
    });
    await auditRepository.createAuditLog({
      actorId: actor.id,
      action: "template_created",
      targetType: "template",
      targetId: template.id,
    });
    res.status(201).json(template);
};

export const updateTemplate = async (req: Request, res: Response) => {
    const { id } = req.params;
    const input = api.admin.templates.update.input.parse(req.body);
    const template = await templateRepository.update(parseInt(id as string, 10), {
      title: input.title ?? undefined,
      body: input.body ?? undefined,
      isActive: input.isActive ?? undefined,
    });
    await auditRepository.createAuditLog({
      actorId: (req as any).user.id,
      action: "template_updated",
      targetType: "template",
      targetId: template.id,
    });
    res.json(template);
};

export const deleteTemplate = async (req: Request, res: Response) => {
    const { id } = req.params;
    await templateRepository.delete(parseInt(id as string, 10));
    await auditRepository.createAuditLog({
      actorId: (req as any).user.id,
      action: "template_deleted",
      targetType: "template",
      targetId: parseInt(id as string, 10),
    });
    res.json({ message: "Deleted" });
};

export const previewBroadcast = async (req: Request, res: Response) => {
    let input: z.infer<typeof api.admin.broadcasts.preview.input>;
    try {
      input = api.admin.broadcasts.preview.input.parse(req.body);
    } catch (err) {
      if (err instanceof z.ZodError) {
        logValidationFailure(
          "POST /api/admin/broadcasts/preview",
          req.body,
          err,
        );
        return res.status(400).json({
          ok: false,
          message: err.errors[0]?.message || "Invalid payload",
        });
      }
      throw err;
    }

    try {
      const user = (req as any).user as User;
      const messageText = input.messageText.trim();
      if (!messageText) {
        return res.status(400).json({
          ok: false,
          message: "Message text required",
        });
      }
      const mode = (process.env.BROADCAST_MODE || "copy").toLowerCase();
      const sourceChatId = process.env.BROADCAST_SOURCE_CHAT_ID || null;
      const sourceMessageId = input.sourceMessageId ?? null;
      if (mode === "forward" && !sourceMessageId) {
        return res.status(400).json({
          ok: false,
          message: "sourceMessageId required for forward mode",
          code: "MISSING_SOURCE_MESSAGE_ID",
        });
      }
      const imageUrlRaw = input.imageUrl ?? input.mediaUrl ?? null;
      const imageUrl = imageUrlRaw ? imageUrlRaw.trim() : null;
      
      const recipients = await userRepository.findRecipientsForBroadcast();
      const recipientsCount = recipients.length;
      const header = formatBroadcastAttribution(user);
      const previewText = `${header}${messageText}`.trim();
      const telegramPayload = buildBroadcastPreviewPayload({
        text: previewText,
        imageUrl,
      });
      const parsed = {
        mode,
        willForward: Boolean(
          mode === "forward" && sourceChatId && sourceMessageId,
        ),
        sourceChatId: mode === "forward" ? sourceChatId : null,
        sourceMessageId: mode === "forward" ? sourceMessageId : null,
      };

      return res.json({
        ok: true,
        preview: {
          text: previewText,
          imageUrl,
          parsed,
          recipientsCount,
          telegramPayload,
        },
      });
    } catch (err) {
      console.error("Broadcast preview error:", err);
      return res
        .status(500)
        .json({ ok: false, message: "Failed to preview broadcast" });
    }
};

export const confirmBroadcastByAdmin = async (req: Request, res: Response) => {
    try {
      const idValue = Number(req.params.id);
      const hasId = Number.isFinite(idValue) && idValue > 0;
      const user = (req as any).user as User;
      const mode = (process.env.BROADCAST_MODE || "copy").toLowerCase();
      const sourceChatId = process.env.BROADCAST_SOURCE_CHAT_ID || null;
      let broadcast = hasId ? await broadcastRepository.findById(idValue) : undefined;

      if (!broadcast) {
        let input: z.infer<typeof api.admin.broadcasts.confirm.input>;
        try {
          input = api.admin.broadcasts.confirm.input.parse(req.body);
        } catch (err) {
          if (err instanceof z.ZodError) {
            logValidationFailure(
              "POST /api/admin/broadcasts/:id/confirm",
              req.body,
              err,
            );
            return res
              .status(400)
              .json({ message: err.errors[0]?.message || "Invalid payload" });
          }
          throw err;
        }

        const messageText = input.messageText.trim();
        if (!messageText) {
          return res.status(400).json({ message: "Message text required" });
        }
        if (mode === "forward" && !input.sourceMessageId) {
          return res.status(400).json({
            message: "Broadcast requires source message for forward mode",
            code: "MISSING_SOURCE_MESSAGE_ID",
          });
        }

        const imageUrlRaw = input.imageUrl ?? input.mediaUrl ?? null;
        const imageUrl = imageUrlRaw ? imageUrlRaw.trim() : null;
        
        broadcast = await broadcastService.createBroadcast({
          createdByAdminId: user.id,
          messageText,
          mediaUrl: imageUrl,
          mode,
          sourceChatId,
          sourceMessageId: input.sourceMessageId ?? null,
          status: "draft",
          totalCount: 0,
        }, user.id);
      }

      if (!broadcast) {
        return res.status(404).json({ message: "Broadcast not found" });
      }

      if (broadcast.status !== "draft") {
        return res.json({
          id: broadcast.id,
          status: broadcast.status,
          totalCount: broadcast.totalCount ?? 0,
        });
      }

      const updated = await broadcastService.confirmBroadcast(broadcast.id, user.id);

      res.json({
        id: updated.id,
        status: updated.status,
        totalCount: updated.totalCount,
      });
    } catch (err: any) {
      console.error("Broadcast confirm error:", err);
      res.status(500).json({ message: err.message || "Failed to confirm broadcast" });
    }
};

export const listBroadcastsByAdmin = async (req: Request, res: Response) => {
    const filters = api.admin.broadcasts.list.input.parse(req.query);
    const broadcasts = await broadcastRepository.findAll({
      status: filters.status,
      limit: filters.limit,
      offset: filters.offset,
    });
    res.json(broadcasts);
};

export const getBroadcastProgressByAdmin = async (req: Request, res: Response) => {
    const { id } = req.params;
    const broadcastId = parseInt(id as string, 10);
    const broadcast = await broadcastRepository.findById(broadcastId);
    if (!broadcast) return res.status(404).json({ message: "Not found" });

    const stats = await broadcastRepository.countLogsByStatus(broadcastId);
    const pending = await broadcastRepository.countPendingLogs(broadcastId);

    res.json({
      status: broadcast.status,
      totalCount: broadcast.totalCount,
      sentCount: stats.sent,
      failedCount: stats.failed,
      pendingCount: pending,
      startedAt: broadcast.startedAt,
      finishedAt: broadcast.finishedAt,
    });
};

export const getBroadcastMetricsByAdmin = async (_req: Request, res: Response) => {
    const failReasons = await broadcastRepository.getFailReasons();
    res.json({ failReasons });
};

export const addAdminBySuperAdmin = async (req: Request, res: Response) => {
    try {
      const { userId } = api.superadmin.admins.add.input.parse(req.body);
      const updated = await userRepository.update(userId, {
        isAdmin: true,
        role: "admin",
        status: "approved",
      });
      await auditRepository.createAuditLog({
        actorId: (req as any).user.id,
        action: "admin_added",
        targetType: "user",
        targetId: updated.id,
      });
      res.json(updated);
    } catch (err) {
      if (err instanceof z.ZodError) {
        return res.status(400).json({ message: err.errors[0].message });
      }
      console.error("Add admin error:", err);
      res.status(500).json({ message: "Failed to add admin" });
    }
};

export const setProStatusBySuperAdmin = async (req: Request, res: Response) => {
    try {
      const { userId, days, note, amount, currency } =
        api.superadmin.billing.setPro.input.parse(req.body);
      const actor = (req as any).user;
      
      const updated = await userService.setProStatus(userId, actor.id, days, String(amount || 0), note);
      
      await billingRepository.create({
        userId,
        amount: String(amount || 0),
        currency: currency || "UZS",
        status: "success",
        type: "PRO_UPGRADE",
        metadata: note || `Manual PRO upgrade for ${days} days`,
      } as any);

      res.json(updated);
    } catch (err) {
      if (err instanceof z.ZodError) {
        return res.status(400).json({ message: err.errors[0].message });
      }
      console.error("Set PRO error:", err);
      res.status(500).json({ message: "Failed to set PRO" });
    }
};

export const listTransactionsBySuperAdmin = async (req: Request, res: Response) => {
    const filters = api.superadmin.billing.transactions.input?.parse(req.query);
    const userIdInput = filters?.userId;
    const userId = userIdInput ? Number(Array.isArray(userIdInput) ? userIdInput[0] : userIdInput) : undefined;
    const txs = await billingRepository.findAll(userId);
    res.json(txs);
};
