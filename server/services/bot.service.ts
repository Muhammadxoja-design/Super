import { userRepository } from "../repositories/user.repository";
import { taskRepository } from "../repositories/task.repository";
import { assignmentRepository } from "../repositories/assignment.repository";
import { auditRepository } from "../repositories/audit.repository";
import { type User, type TaskAssignment } from "@shared/schema";

export class BotService {
  async handleContact(telegramId: string, phone: string) {
    const user = await userRepository.findByTelegramId(telegramId);
    if (!user) throw new Error("User not found");
    return userRepository.update(user.id, { phone });
  }

  async createTaskFromBot(title: string, adminId: number) {
    const task = await taskRepository.create({
      title,
      description: null,
      createdByAdminId: adminId,
    });

    await auditRepository.createAuditLog({
      actorId: adminId,
      action: "task_created",
      targetType: "task",
      targetId: task.id,
      metadata: JSON.stringify({ via: "bot" }),
    });

    return task;
  }

  async submitProof(assignmentId: number, userId: number, proof: any) {
    const assignment = await assignmentRepository.findById(assignmentId);
    if (!assignment) throw new Error("Assignment not found");

    if (assignment.status !== "DONE") {
      await assignmentRepository.updateStatus(assignmentId, "DONE", undefined, userId);
    }

    await assignmentRepository.updateProof(assignmentId, {
      ...proof,
      proofSubmittedAt: new Date(),
    });

    await auditRepository.createAuditLog({
      actorId: userId,
      action: "task_status_updated",
      targetType: "task_assignment",
      targetId: assignmentId,
      metadata: JSON.stringify({ status: "DONE", via: "bot" }),
    });

    return assignment;
  }
}

export const botService = new BotService();
