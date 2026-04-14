import { Router } from "express";
import { api } from "@shared/routes";
import * as authController from "../controllers/auth.controller";
import { authenticate, requireSubscription, requireApprovedUser } from "../middleware/auth";

const router = Router();

router.post(api.auth.telegram.path, authController.telegramAuth);
router.post(api.auth.login.path, authController.login);
router.post(api.auth.logout.path, authenticate, authController.logout);
router.get(
  api.auth.me.path,
  authenticate,
  requireSubscription,
  requireApprovedUser,
  authController.getMe
);
router.post(api.auth.register.path, authController.register);

export default router;
