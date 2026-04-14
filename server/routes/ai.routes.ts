import { Router } from "express";
import * as aiController from "../controllers/ai.controller";
import { authenticate } from "../middleware/auth";

const router = Router();

router.post("/api/ai/explain", authenticate, aiController.explainTaskByAI);

export default router;
