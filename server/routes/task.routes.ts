import { Router } from "express";
import { api } from "@shared/routes";
import * as taskController from "../controllers/task.controller";
import { authenticate, requireSubscription, requireApprovedUser, requirePro } from "../middleware/auth";

const router = Router();

router.get(
  api.tasks.list.path,
  authenticate,
  requireSubscription,
  requireApprovedUser,
  requirePro,
  taskController.listTasks
);

router.patch(
  api.tasks.updateStatus.path,
  authenticate,
  requireSubscription,
  requireApprovedUser,
  requirePro,
  taskController.updateTaskStatus
);

router.post(
  api.tasks.complete.path,
  authenticate,
  requireSubscription,
  requireApprovedUser,
  requirePro,
  taskController.completeTask
);

export default router;
