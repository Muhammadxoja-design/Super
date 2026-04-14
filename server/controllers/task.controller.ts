import { Request, Response } from "express";
import { api } from "@shared/routes";
import { z } from "zod";
import { userRepository } from "../repositories/user.repository";
import { taskRepository } from "../repositories/task.repository";
import { assignmentRepository } from "../repositories/assignment.repository";
import { auditRepository } from "../repositories/audit.repository";
import { taskService } from "../services/task.service";
import { type User } from "@shared/schema";
import { 
  isAdminUser, 
  createAuditLog,
 } from "../utils/helpers";
import { getStatusLabel } from "../task-status";

export const listTasks = async (req: Request, res: Response) => {
    const user = (req as any).user as User;
    const filters = api.tasks.list.input?.parse(req.query);
    const assignments = await assignmentRepository.findByUserId(
      user.id,
      filters?.status,
    );
    res.json(assignments);
};

export const updateTaskStatus = async (req: Request, res: Response) => {
    const user = (req as any).user as User;
    try {
      const id = req.params.id as string;
      const { status, note, proofText, proofFileId, proofType } =
        api.tasks.updateStatus.input.parse(req.body);
      
      const assignmentId = parseInt(id, 10);
      const assignment = await assignmentRepository.findById(assignmentId);
      if (!assignment) {
        return res.status(404).json({ message: "Assignment not found" });
      }
      if (!isAdminUser(user) && assignment.userId !== user.id) {
        return res.status(403).json({ message: "Forbidden" });
      }
      if (
        status === "DONE" &&
        !proofFileId &&
        (!proofText || proofText.trim().length < 5)
      ) {
        return res.status(400).json({
          message: "Proof required for DONE status",
          code: "PROOF_REQUIRED",
        });
      }

      const updated = await assignmentRepository.updateStatus(
        assignment.id,
        status,
        note,
        user.id,
      );

      if (updated) {
        if (status === "DONE") {
          await assignmentRepository.updateProof(updated.id, {
            proofText: proofText?.trim() || null,
            proofFileId: proofFileId ?? null,
            proofType: proofFileId ? proofType || "file" : null,
            proofSubmittedAt: new Date(),
          });
        }
        await auditRepository.createAuditLog({
          actorId: user.id,
          action: "task_status_updated",
          targetType: "task_assignment",
          targetId: updated.id,
          metadata: JSON.stringify({ status, via: "web" }),
        });
      }

      const finalAssignment = updated ?? assignment;

      const { runtimeBot } = await import("../routes/index");
      if (runtimeBot) {
        const task = await taskRepository.findById(finalAssignment.taskId);
        const adminUser = task
          ? await userRepository.findById(task.createdByAdminId)
          : null;
        if (adminUser?.telegramId) {
          const when = new Date().toLocaleString("uz-UZ");
          runtimeBot.telegram
            .sendMessage(
              adminUser.telegramId,
              `🟢 Status yangilandi\nBuyruq: ${task?.title}\nFoydalanuvchi: ${user.firstName || user.username || user.id}\nStatus: ${getStatusLabel(status)}\nVaqt: ${when}`,
            )
            .catch(console.error);
        }
      }

      res.json(finalAssignment);
    } catch (err) {
      if (err instanceof z.ZodError) {
        return res.status(400).json({ message: err.errors[0].message });
      }
      console.error("Update status error:", err);
      res.status(500).json({ message: "Failed to update status" });
    }
};

export const completeTask = async (req: Request, res: Response) => {
    const user = (req as any).user as User;
    const assignmentId = parseInt(req.params.id as string, 10);
    const assignment = await assignmentRepository.findById(assignmentId);
    if (!assignment || assignment.userId !== user.id) {
      return res.status(404).json({ message: "Assignment not found" });
    }
    const proofText =
      typeof req.body?.proofText === "string"
        ? req.body.proofText
        : undefined;
    const proofFileId =
      typeof req.body?.proofFileId === "string"
        ? req.body.proofFileId
        : undefined;
    const proofType =
      typeof req.body?.proofType === "string"
        ? req.body.proofType
        : undefined;
    if (!proofFileId && (!proofText || proofText.trim().length < 5)) {
      return res.status(400).json({
        message: "Proof required for DONE status",
        code: "PROOF_REQUIRED",
      });
    }

    const updated = await assignmentRepository.updateStatus(
      assignment.id,
      "DONE",
      undefined,
      user.id,
    );
    
    if (updated) {
      await assignmentRepository.updateProof(updated.id, {
        proofText: proofText?.trim() || null,
        proofFileId: proofFileId ?? null,
        proofType: proofFileId ? proofType || "file" : null,
        proofSubmittedAt: new Date(),
      });
      await auditRepository.createAuditLog({
        actorId: user.id,
        action: "task_completed",
        targetType: "task_assignment",
        targetId: updated.id,
      });
    }
    
    const finalAssignment = updated ?? assignment;
    res.json(finalAssignment);
};
