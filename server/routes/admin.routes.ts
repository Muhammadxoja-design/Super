import { Router } from "express";
import { api } from "@shared/routes";
import * as adminController from "../controllers/admin.controller";
import { 
  authenticate, 
  requireSubscription, 
  requireAdmin, 
  requireSuperAdmin 
} from "../middleware/auth";

const router = Router();

// Users
router.get(
  api.admin.users.list.path,
  authenticate,
  requireSubscription,
  requireAdmin,
  adminController.listUsers
);

router.get(
  api.admin.users.search.path,
  authenticate,
  requireSubscription,
  requireSuperAdmin,
  adminController.searchUsers
);

router.post(
  api.admin.users.updateStatus.path,
  authenticate,
  requireSubscription,
  requireAdmin,
  adminController.updateUserStatusByAdmin
);

// Tasks
router.post(
  api.admin.tasks.create.path,
  authenticate,
  requireSubscription,
  requireAdmin,
  adminController.createAdminTask
);

router.post(
  api.admin.tasks.previewTarget.path,
  authenticate,
  requireSubscription,
  requireAdmin,
  adminController.previewTaskTarget
);

router.post(
  api.admin.tasks.assign.path,
  authenticate,
  requireSubscription,
  requireAdmin,
  adminController.assignTaskByAdmin
);

router.get(
  api.admin.tasks.list.path,
  authenticate,
  requireSubscription,
  requireAdmin,
  adminController.listAdminTasks
);

// Audit Logs
router.get(
  api.admin.auditLogs.list.path,
  authenticate,
  requireSubscription,
  requireAdmin,
  adminController.listAuditLogs
);

// Templates
router.get(
  api.admin.templates.list.path,
  authenticate,
  requireSubscription,
  requireAdmin,
  adminController.listTemplates
);

router.post(
  api.admin.templates.create.path,
  authenticate,
  requireSubscription,
  requireSuperAdmin,
  adminController.createTemplate
);

router.patch(
  api.admin.templates.update.path,
  authenticate,
  requireSubscription,
  requireSuperAdmin,
  adminController.updateTemplate
);

router.delete(
  api.admin.templates.delete.path,
  authenticate,
  requireSubscription,
  requireSuperAdmin,
  adminController.deleteTemplate
);

// Broadcasts
router.post(
  api.admin.broadcasts.preview.path,
  authenticate,
  requireSubscription,
  requireAdmin,
  adminController.previewBroadcast
);

router.post(
  api.admin.broadcasts.confirm.path,
  authenticate,
  requireSubscription,
  requireAdmin,
  adminController.confirmBroadcastByAdmin
);

router.get(
  api.admin.broadcasts.list.path,
  authenticate,
  requireSubscription,
  requireAdmin,
  adminController.listBroadcastsByAdmin
);

router.get(
  api.admin.broadcasts.progress.path,
  authenticate,
  requireSubscription,
  requireAdmin,
  adminController.getBroadcastProgressByAdmin
);

router.get(
  api.admin.metrics.broadcasts.path,
  authenticate,
  requireSubscription,
  requireAdmin,
  adminController.getBroadcastMetricsByAdmin
);

// Super Admin
router.post(
  api.superadmin.admins.add.path,
  authenticate,
  requireSubscription,
  requireSuperAdmin,
  adminController.addAdminBySuperAdmin
);

router.post(
  api.superadmin.billing.setPro.path,
  authenticate,
  requireSubscription,
  requireSuperAdmin,
  adminController.setProStatusBySuperAdmin
);

router.get(
  api.superadmin.billing.transactions.path,
  authenticate,
  requireSubscription,
  requireSuperAdmin,
  adminController.listTransactionsBySuperAdmin
);

export default router;
