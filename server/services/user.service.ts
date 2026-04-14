import { userRepository } from "../repositories/user.repository";
import { auditRepository } from "../repositories/audit.repository";
import { type User } from "@shared/schema";

export class UserService {
  async updateUserStatus(
    userId: number,
    adminId: number,
    status: string,
    rejectionReason?: string
  ): Promise<User> {
    const user = await userRepository.update(userId, {
      status,
      rejectionReason: rejectionReason || null,
      approvedAt: status === "approved" ? new Date() : undefined,
      rejectedAt: status === "rejected" ? new Date() : undefined,
    });

    await auditRepository.createAuditLog({
      actorId: adminId,
      action: "user_status_updated",
      targetType: "user",
      targetId: user.id,
      metadata: JSON.stringify({ status }),
    });

    return user;
  }

  async setProStatus(
    userId: number,
    adminId: number,
    days: number,
    amount: string,
    note?: string
  ): Promise<User> {
    const proUntil = new Date(Date.now() + days * 24 * 60 * 60 * 1000);
    const user = await userRepository.update(userId, {
      plan: "PRO",
      proUntil,
    });

    // Note: Transactional logic here would be better but let's stick to the current pattern
    // In a real scenario, we'd use a repository to create the billing transaction
    
    await auditRepository.createAuditLog({
      actorId: adminId,
      action: "billing_set_pro",
      targetType: "user",
      targetId: user.id,
      metadata: JSON.stringify({ days, note }),
    });

    return user;
  }
}

export const userService = new UserService();
