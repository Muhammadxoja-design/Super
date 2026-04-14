import { Request, Response } from "express";
import { queryDatabaseNow } from "../db";
import { SERVICE_NAME, SERVICE_VERSION } from "../utils/constants";

export const healthCheck = (_req: Request, res: Response) => {
  res.status(200).json({
    ok: true,
    uptime: process.uptime(),
    timestamp: new Date().toISOString(),
    version: SERVICE_VERSION,
    service: SERVICE_NAME,
  });
};

export const dbHealthCheck = async (_req: Request, res: Response) => {
  try {
    const dbNow = await queryDatabaseNow();
    const dbTime =
      typeof dbNow === "string" ? dbNow : dbNow ? dbNow.toISOString() : null;
    res.status(200).json({
      ok: true,
      timestamp: new Date().toISOString(),
      dbTime,
    });
  } catch (error) {
    console.error("DB health check failed:", error);
    res.status(503).json({
      ok: false,
      timestamp: new Date().toISOString(),
      error: "DB_UNAVAILABLE",
    });
  }
};
