import { taskRepository } from "../repositories/task.repository";
import { assignmentRepository } from "../repositories/assignment.repository";
import { userRepository } from "../repositories/user.repository";
import { auditRepository } from "../repositories/audit.repository";
import { type Task, type InsertTask, type TaskAssignment, type User } from "@shared/schema";

export class TaskService {
  async createTask(input: Omit<InsertTask, "createdByAdminId">, adminId: number): Promise<Task> {
    const task = await taskRepository.create({
      ...input,
      createdByAdminId: adminId,
    } as InsertTask);

    await auditRepository.createAuditLog({
      actorId: adminId,
      action: "task_created",
      targetType: "task",
      targetId: task.id,
    });

    return task;
  }

  async assignTask(taskId: number, userId: number, adminId: number | null): Promise<TaskAssignment> {
    const assignment = await assignmentRepository.create({
      taskId,
      userId,
      status: "ACTIVE",
    });

    await auditRepository.createAuditLog({
      actorId: adminId,
      action: "task_assigned",
      targetType: "task_assignment",
      targetId: assignment.id,
      metadata: JSON.stringify({ via: adminId ? "web" : "bot" }),
    });

    return assignment;
  }

  async bulkAssign(taskId: number, targetUsers: User[], adminId: number): Promise<TaskAssignment[]> {
    const assignments: TaskAssignment[] = [];
    for (const user of targetUsers) {
      const assignment = await this.assignTask(taskId, user.id, adminId);
      assignments.push(assignment);
    }
    return assignments;
  }

  async updateAssignmentStatus(
    assignmentId: number, 
    status: string, 
    userId: number, 
    note?: string
  ): Promise<TaskAssignment> {
    const assignment = await assignmentRepository.updateStatus(assignmentId, status as "ACTIVE" | "DONE" | "CANNOT_DO" | "PENDING" | "WILL_DO", note, userId);
    
    await auditRepository.createAuditLog({
      actorId: userId,
      action: "task_status_updated",
      targetType: "task_assignment",
      targetId: assignmentId,
      metadata: JSON.stringify({ status, via: "service" }),
    });

    return assignment;
  }
}

export const taskService = new TaskService();
