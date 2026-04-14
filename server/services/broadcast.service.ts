import { broadcastRepository } from "../repositories/broadcast.repository";
import { userRepository } from "../repositories/user.repository";
import { auditRepository } from "../repositories/audit.repository";
import { type Broadcast, type InsertBroadcast, type User } from "@shared/schema";
import crypto from "crypto";

export class BroadcastService {
  async createBroadcast(input: InsertBroadcast, adminId: number): Promise<Broadcast> {
    const broadcast = await broadcastRepository.create({
      ...input,
      createdByAdminId: adminId,
      correlationId: crypto.randomUUID(),
      status: "draft",
    });

    await auditRepository.createAuditLog({
      actorId: adminId,
      action: "broadcast_created",
      targetType: "broadcast",
      targetId: broadcast.id,
    });

    return broadcast;
  }

  async confirmBroadcast(broadcastId: number, adminId: number): Promise<Broadcast> {
    const recipients = await userRepository.findRecipientsForBroadcast();
    const broadcast = await broadcastRepository.update(broadcastId, {
      status: "pending",
      totalCount: recipients.length,
      startedAt: new Date(),
    });

    const logs = recipients.map((user) => ({
      broadcastId: broadcast.id,
      userId: user.id,
      telegramId: user.telegramId,
      status: "pending" as const,
    }));

    await broadcastRepository.createLogs(logs);

    await auditRepository.createAuditLog({
      actorId: adminId,
      action: "broadcast_confirmed",
      targetType: "broadcast",
      targetId: broadcast.id,
    });

    return broadcast;
  }
}

export const broadcastService = new BroadcastService();
