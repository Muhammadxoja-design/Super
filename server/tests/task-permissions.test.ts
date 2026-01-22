import { beforeEach, describe, expect, it } from "vitest";
import express from "express";
import request from "supertest";
import { createServer } from "http";
import { db } from "../db";
import { users, tasks, taskAssignments, sessions, auditLogs } from "@shared/schema";
import { hashPassword } from "../password";
import { storage } from "../storage";
import { registerRoutes } from "../routes";

const createTestApp = async () => {
  const app = express();
  const server = createServer(app);

  app.use(express.json());
  app.use(express.urlencoded({ extended: false }));

  await registerRoutes(server, app);

  return { app, server };
};

const resetDb = async () => {
  await db.delete(taskAssignments).execute();
  await db.delete(tasks).execute();
  await db.delete(sessions).execute();
  await db.delete(auditLogs).execute();
  await db.delete(users).execute();
};

describe("task status permissions", () => {
  beforeEach(async () => {
    await resetDb();
  });

  it("allows admin to update any task status", async () => {
    const { app } = await createTestApp();
    const adminPassword = "password123";
    const admin = await storage.createUser({
      telegramId: "web:admin",
      login: "admin",
      passwordHash: await hashPassword(adminPassword),
      isAdmin: true,
      status: "approved",
      firstName: "Admin",
    });

    const user = await storage.createUser({
      telegramId: "web:user",
      login: "user1",
      passwordHash: await hashPassword("password123"),
      status: "approved",
      firstName: "User",
    });

    const task = await storage.createTask({
      title: "Test",
      description: null,
      createdByAdminId: admin.id,
    });

    const assignment = await storage.assignTask({
      taskId: task.id,
      userId: user.id,
      status: "ACTIVE",
    });

    const loginRes = await request(app)
      .post("/api/auth/login")
      .send({ login: admin.login, password: adminPassword });
    const cookie = loginRes.headers["set-cookie"]?.[0];

    const res = await request(app)
      .patch(`/api/tasks/${assignment.id}/status`)
      .set("Cookie", cookie)
      .send({ status: "DONE", proofText: "Bajarildi" });

    expect(res.status).toBe(200);
    expect(res.body.status).toBe("DONE");
  });

  it("blocks non-owner from updating task status", async () => {
    const { app } = await createTestApp();
    const password = "password123";
    const admin = await storage.createUser({
      telegramId: "web:admin",
      login: "admin",
      passwordHash: await hashPassword(password),
      isAdmin: true,
      status: "approved",
      firstName: "Admin",
    });

    const owner = await storage.createUser({
      telegramId: "web:owner",
      login: "owner",
      passwordHash: await hashPassword(password),
      status: "approved",
      firstName: "Owner",
    });

    const other = await storage.createUser({
      telegramId: "web:other",
      login: "other",
      passwordHash: await hashPassword(password),
      status: "approved",
      firstName: "Other",
    });

    const task = await storage.createTask({
      title: "Test",
      description: null,
      createdByAdminId: admin.id,
    });

    const assignment = await storage.assignTask({
      taskId: task.id,
      userId: owner.id,
      status: "ACTIVE",
    });

    const loginRes = await request(app)
      .post("/api/auth/login")
      .send({ login: other.login, password: password });
    const cookie = loginRes.headers["set-cookie"]?.[0];

    const res = await request(app)
      .patch(`/api/tasks/${assignment.id}/status`)
      .set("Cookie", cookie)
      .send({ status: "DONE", proofText: "Bajarildi" });

    expect(res.status).toBe(403);
  });
});
