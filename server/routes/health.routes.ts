import { Router } from "express";
import * as healthController from "../controllers/health.controller";

const router = Router();

router.get("/health", healthController.healthCheck);
router.get("/healthz", healthController.healthCheck);
router.get("/db-health", healthController.dbHealthCheck);

export default router;
