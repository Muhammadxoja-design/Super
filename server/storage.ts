
import { db } from "./db";
import { users, tasks, type User, type InsertUser, type Task, type InsertTask } from "@shared/schema";
import { eq, and } from "drizzle-orm";

export interface IStorage {
  // User operations
  getUser(id: number): Promise<User | undefined>;
  getUserByTelegramId(telegramId: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  updateUser(id: number, updates: Partial<InsertUser>): Promise<User>;
  updateUserStatus(id: number, status: string, reason?: string): Promise<User>;
  getUsersByStatus(status?: string): Promise<User[]>;
  getAllUsers(): Promise<User[]>;

  // Task operations
  getTask(id: number): Promise<Task | undefined>;
  getTasksByUserId(userId: number): Promise<Task[]>;
  createTask(task: InsertTask): Promise<Task>;
  updateTaskStatus(id: number, completed: boolean): Promise<Task>;
}

export class DatabaseStorage implements IStorage {
  async getUser(id: number): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user;
  }

  async getUserByTelegramId(telegramId: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.telegramId, telegramId));
    return user;
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const [user] = await db.insert(users).values(insertUser).returning();
    return user;
  }

  async updateUser(id: number, updates: Partial<InsertUser>): Promise<User> {
    const [user] = await db.update(users).set(updates).where(eq(users.id, id)).returning();
    return user;
  }

  async updateUserStatus(id: number, status: string, reason?: string): Promise<User> {
    const [user] = await db.update(users)
      .set({ 
        status: status as any, 
        rejectionReason: reason 
      })
      .where(eq(users.id, id))
      .returning();
    return user;
  }

  async getUsersByStatus(status: string): Promise<User[]> {
    return db.select().from(users).where(eq(users.status, status as any));
  }

  async getAllUsers(): Promise<User[]> {
    return db.select().from(users);
  }

  async getTask(id: number): Promise<Task | undefined> {
    const [task] = await db.select().from(tasks).where(eq(tasks.id, id));
    return task;
  }

  async getTasksByUserId(userId: number): Promise<Task[]> {
    return db.select().from(tasks).where(eq(tasks.assignedToId, userId));
  }

  async createTask(insertTask: InsertTask): Promise<Task> {
    const [task] = await db.insert(tasks).values(insertTask).returning();
    return task;
  }

  async updateTaskStatus(id: number, completed: boolean): Promise<Task> {
    const [task] = await db.update(tasks)
      .set({ 
        completed, 
        completedAt: completed ? new Date() : null 
      })
      .where(eq(tasks.id, id))
      .returning();
    return task;
  }
}

export const storage = new DatabaseStorage();
