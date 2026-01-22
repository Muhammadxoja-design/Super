import { beforeEach, describe, expect, it } from "vitest";
import express from "express";
import request from "supertest";
import { createServer } from "http";
import crypto from "crypto";
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

describe("API basics", () => {
  beforeEach(async () => {
    await resetDb();
  });

  it("GET /health returns status payload", async () => {
    const { app } = await createTestApp();
    const res = await request(app).get("/health");

    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({
      ok: true,
    });
    expect(res.body.uptime).toBeTypeOf("number");
    expect(res.body.timestamp).toBeTypeOf("string");
  });

  it("GET /api/me without auth returns 401", async () => {
    const { app } = await createTestApp();
    const res = await request(app).get("/api/me");

    expect(res.status).toBe(401);
  });
});

describe("Admin task endpoints", () => {
  beforeEach(async () => {
    await resetDb();
  });

  it("creates and assigns tasks with admin auth", async () => {
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

    const loginRes = await request(app)
      .post("/api/auth/login")
      .send({ login: admin.login, password: adminPassword });
    expect(loginRes.status).toBe(200);
    const cookie = loginRes.headers["set-cookie"]?.[0];
    expect(cookie).toBeDefined();

    const taskRes = await request(app)
      .post("/api/admin/tasks")
      .set("Cookie", cookie)
      .send({
        title: "Test task",
        description: "Test description",
        idempotencyKey: crypto.randomUUID(),
      });

    expect(taskRes.status).toBe(201);

    const assignRes = await request(app)
      .post(`/api/admin/tasks/${taskRes.body.id}/assign`)
      .set("Cookie", cookie)
      .send({ targetType: "USER", userId: user.id });

    expect(assignRes.status).toBe(201);
    expect(assignRes.body.assigned).toBe(1);
  });

  it("returns validation errors for invalid task payloads", async () => {
    const { app } = await createTestApp();
    const adminPassword = "password123";
    await storage.createUser({
      telegramId: "web:admin",
      login: "admin",
      passwordHash: await hashPassword(adminPassword),
      isAdmin: true,
      status: "approved",
      firstName: "Admin",
    });

    const loginRes = await request(app)
      .post("/api/auth/login")
      .send({ login: "admin", password: adminPassword });
    const cookie = loginRes.headers["set-cookie"]?.[0];

    const taskRes = await request(app)
      .post("/api/admin/tasks")
      .set("Cookie", cookie)
      .send({ idempotencyKey: crypto.randomUUID() });

    expect(taskRes.status).toBe(400);
  });
});
