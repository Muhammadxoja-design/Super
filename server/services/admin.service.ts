import { userRepository } from "../repositories/user.repository";
import { taskRepository } from "../repositories/task.repository";
import { assignmentRepository } from "../repositories/assignment.repository";
import { auditRepository } from "../repositories/audit.repository";
import { templateRepository } from "../repositories/template.repository";
import { billingRepository } from "../repositories/billing.repository";
import { taskService } from "./task.service";
import { type User, type Task, type TaskAssignment } from "@shared/schema";
import { dispatchCommandToBots } from "../bot-automation";

export class AdminService {
  async listUsers(filters: any) {
    const users = await userRepository.findByFilters(filters);
    const total = await userRepository.countByFilters(filters);
    return { users, total };
  }

  async assignTaskBulk(id: number, input: any, actor: User, webAppUrl?: string) {
    const { targetType, targetValue, userId, forwardMessageId, templateId } = input;
    
    const task = await taskRepository.findById(id);
    if (!task) throw new Error("Task not found");

    const resolvedTargetValue = targetType === "USER" 
      ? (userId ?? targetValue) 
      : (typeof targetValue === "string" ? targetValue.trim() : targetValue);

    let targetUsers: User[] = [];
    if (targetType === "USER") {
      const u = typeof resolvedTargetValue === "number" 
        ? await userRepository.findById(resolvedTargetValue)
        : await userRepository.findByTelegramId(String(resolvedTargetValue));
      if (u) targetUsers = [u];
    } else {
      targetUsers = await userRepository.findByFilters({
        [targetType.toLowerCase()]: resolvedTargetValue,
        status: "approved"
      });
    }

    if (targetUsers.length === 0) throw new Error("No matching users");

    const template = templateId ? await templateRepository.findById(templateId) : null;
    
    const assignments: TaskAssignment[] = [];
    const fakeBotsToDispatch: any[] = [];

    for (const target of targetUsers) {
      const assignment = await taskService.assignTask(task.id, target.id, actor.id);
      assignments.push(assignment);

      if (target.telegramId?.startsWith("fake_")) {
        fakeBotsToDispatch.push({
          assignmentId: assignment.id,
          telegramId: target.telegramId,
          taskTitle: task.title,
        });
      }
    }

    if (fakeBotsToDispatch.length > 0) {
      dispatchCommandToBots(fakeBotsToDispatch).catch(console.error);
    }

    await taskRepository.update(task.id, {
      targetType,
      targetValue: resolvedTargetValue ? String(resolvedTargetValue) : null,
      targetCount: assignments.length,
      templateId: template?.id ?? null,
    });

    // Handle notifications (this should ideally be in a notification service)
    const { enqueueTaskNotification } = await import("../utils/bot-helpers");
    for (const assignment of assignments) {
      const assignee = await userRepository.findById(assignment.userId);
      await enqueueTaskNotification(
        assignment,
        assignee ?? undefined,
        task,
        template?.body ?? null,
        actor.id,
        forwardMessageId,
        webAppUrl
      );
    }

    return { assigned: assignments.length, assignments };
  }
}

export const adminService = new AdminService();
