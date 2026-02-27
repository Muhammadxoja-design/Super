import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
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


  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("POST /api/auth/login returns 200 even when non-critical auth side effects fail", async () => {
    const { app } = await createTestApp();
    const password = "password123";
    await storage.createUser({
      telegramId: "web:user",
      login: "user1",
      passwordHash: await hashPassword(password),
      status: "approved",
      firstName: "User",
    });

    vi.spyOn(storage, "createAuditLog").mockRejectedValueOnce(new Error("audit failed"));

    const res = await request(app)
      .post("/api/auth/login")
      .send({ login: "user1", password });

    expect(res.status).toBe(200);
    expect(res.body.user?.login).toBe("user1");
    expect(res.headers["set-cookie"]?.[0]).toContain("sid=");
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

describe("Registration approval", () => {
  const basePayload = {
    login: "newuser",
    password: "password123",
    username: "newuser",
    firstName: "Aziz",
    lastName: "Kamalov",
    phone: "+998901234567",
    birthDate: "2000-01-01",
    region: "Qoraqalpog'iston Respublikasi",
    district: "Amudaryo tumani",
    mahalla: "A.Navoiy nomli MFY",
    address: "Beruniy, 1-uy",
    direction: "Mutolaa",
  };

  const originalApprovalEnv = process.env.REQUIRE_ADMIN_APPROVAL;

  beforeEach(async () => {
    await resetDb();
  });

  it("registers user as approved when admin approval is disabled", async () => {
    process.env.REQUIRE_ADMIN_APPROVAL = "false";
    const { app } = await createTestApp();
    const res = await request(app).post("/api/auth/register").send(basePayload);

    expect(res.status).toBe(201);
    expect(res.body.status).toBe("approved");
  });

  it("registers user as pending when admin approval is required", async () => {
    process.env.REQUIRE_ADMIN_APPROVAL = "true";
    const { app } = await createTestApp();
    const res = await request(app)
      .post("/api/auth/register")
      .send({ ...basePayload, login: "newuser2", username: "newuser2" });

    expect(res.status).toBe(201);
    expect(res.body.status).toBe("pending");
  });

  afterEach(() => {
    if (originalApprovalEnv === undefined) {
      delete process.env.REQUIRE_ADMIN_APPROVAL;
    } else {
      process.env.REQUIRE_ADMIN_APPROVAL = originalApprovalEnv;
    }
  });
});

describe("Admin users list", () => {
  beforeEach(async () => {
    await resetDb();
  });

  it("returns users for admin accounts with isAdmin flag", async () => {
    const { app } = await createTestApp();
    const adminPassword = "password123";
    await storage.createUser({
      telegramId: "web:admin",
      login: "admin",
      passwordHash: await hashPassword(adminPassword),
      isAdmin: true,
      role: "super_admin",
      status: "approved",
      firstName: "Admin",
    });

    await storage.createUser({
      telegramId: "web:user1",
      login: "user1",
      passwordHash: await hashPassword("password123"),
      status: "approved",
      firstName: "User",
    });

    const loginRes = await request(app)
      .post("/api/auth/login")
      .send({ login: "admin", password: adminPassword });
    const cookie = loginRes.headers["set-cookie"]?.[0];

    const pageSize = 20;
    const listRes = await request(app)
      .get(`/api/admin/users?page=1&pageSize=${pageSize}`)
      .set("Cookie", cookie);

    expect(listRes.status).toBe(200);
    expect(listRes.body.items.length).toBeGreaterThan(0);
    expect(typeof listRes.body.total).toBe("number");
    expect(typeof listRes.body.totalPages).toBe("number");
    expect(listRes.body.totalPages).toBe(
      Math.max(1, Math.ceil(listRes.body.total / pageSize)),
    );
  });

  it("paginates admin users list", async () => {
    const { app } = await createTestApp();
    const adminPassword = "password123";
    await storage.createUser({
      telegramId: "web:admin",
      login: "admin",
      passwordHash: await hashPassword(adminPassword),
      isAdmin: true,
      role: "super_admin",
      status: "approved",
      firstName: "Admin",
    });

    for (let i = 0; i < 25; i += 1) {
      await storage.createUser({
        telegramId: `web:user${i}`,
        login: `user${i}`,
        passwordHash: await hashPassword("password123"),
        status: "approved",
        firstName: `User${i}`,
      });
    }

    const loginRes = await request(app)
      .post("/api/auth/login")
      .send({ login: "admin", password: adminPassword });
    const cookie = loginRes.headers["set-cookie"]?.[0];

    const pageSize = 20;
    const page1 = await request(app)
      .get(`/api/admin/users?page=1&pageSize=${pageSize}`)
      .set("Cookie", cookie);
    const page2 = await request(app)
      .get(`/api/admin/users?page=2&pageSize=${pageSize}`)
      .set("Cookie", cookie);

    expect(page1.status).toBe(200);
    expect(page1.body.items).toHaveLength(20);
    expect(typeof page1.body.total).toBe("number");
    expect(typeof page1.body.totalPages).toBe("number");
    expect(page1.body.totalPages).toBe(
      Math.max(1, Math.ceil(page1.body.total / pageSize)),
    );
    expect(page2.status).toBe(200);
    expect(page2.body.items).toHaveLength(5);
    expect(page2.body.total).toBe(26);
    expect(page2.body.totalPages).toBe(
      Math.max(1, Math.ceil(page2.body.total / pageSize)),
    );
  });
});
