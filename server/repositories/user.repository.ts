import { users, type User, type InsertUser } from "@shared/schema";
import { db } from "../db";
import { eq, or, ilike, and, desc, sql, gte } from "drizzle-orm";

export class UserRepository {
  async findById(id: number): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user;
  }

  async findByTelegramId(telegramId: string): Promise<User | undefined> {
    const [user] = await db
      .select()
      .from(users)
      .where(eq(users.telegramId, telegramId));
    return user;
  }

  async findByLogin(login: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.login, login));
    return user;
  }

  async create(user: InsertUser): Promise<User> {
    const [row] = await db.insert(users).values(user).returning();
    return row;
  }

  async update(id: number, updates: Partial<InsertUser>): Promise<User> {
    const [user] = await db
      .update(users)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(users.id, id))
      .returning();
    return user;
  }

  async findAll(): Promise<User[]> {
    return db.select().from(users).orderBy(desc(users.createdAt));
  }

  async findByFilters(filters: {
    status?: string;
    region?: string;
    district?: string;
    viloyat?: string;
    tuman?: string;
    shahar?: string;
    mahalla?: string;
    direction?: string;
    search?: string;
    limit?: number;
    offset?: number;
  }): Promise<User[]> {
    const searchTerm = filters.search?.trim();
    const searchCondition = searchTerm
      ? or(
          ilike(users.firstName, `%${searchTerm}%`),
          ilike(users.lastName, `%${searchTerm}%`),
          ilike(users.username, `%${searchTerm}%`),
          ilike(users.phone, `%${searchTerm}%`),
          ilike(users.region, `%${searchTerm}%`),
          ilike(users.district, `%${searchTerm}%`),
          ilike(users.mahalla, `%${searchTerm}%`),
          ilike(users.viloyat, `%${searchTerm}%`),
          ilike(users.tuman, `%${searchTerm}%`),
          ilike(users.shahar, `%${searchTerm}%`),
        )
      : undefined;
    const conditions = [
      filters.status ? eq(users.status, filters.status) : undefined,
      filters.region ? eq(users.region, filters.region) : undefined,
      filters.district ? eq(users.district, filters.district) : undefined,
      filters.viloyat ? eq(users.viloyat, filters.viloyat) : undefined,
      filters.tuman ? eq(users.tuman, filters.tuman) : undefined,
      filters.shahar ? eq(users.shahar, filters.shahar) : undefined,
      filters.mahalla ? eq(users.mahalla, filters.mahalla) : undefined,
      filters.direction ? eq(users.direction, filters.direction) : undefined,
      searchCondition,
    ].filter(Boolean);

    let query: any = db.select().from(users);
    if (conditions.length) {
      query = query.where(and(...conditions));
    }
    query = query.orderBy(desc(users.createdAt));
    if (filters.limit) {
      query = query.limit(filters.limit);
    }
    if (filters.offset) {
      query = query.offset(filters.offset);
    }
    return await query;
  }

  async countByFilters(filters: {
    status?: string;
    region?: string;
    district?: string;
    viloyat?: string;
    tuman?: string;
    shahar?: string;
    mahalla?: string;
    direction?: string;
    search?: string;
  }): Promise<number> {
    const searchTerm = filters.search?.trim();
    const searchCondition = searchTerm
      ? or(
          ilike(users.firstName, `%${searchTerm}%`),
          ilike(users.lastName, `%${searchTerm}%`),
          ilike(users.username, `%${searchTerm}%`),
          ilike(users.phone, `%${searchTerm}%`),
        )
      : undefined;
    const conditions = [
      filters.status ? eq(users.status, filters.status) : undefined,
      filters.region ? eq(users.region, filters.region) : undefined,
      filters.district ? eq(users.district, filters.district) : undefined,
      filters.viloyat ? eq(users.viloyat, filters.viloyat) : undefined,
      filters.tuman ? eq(users.tuman, filters.tuman) : undefined,
      filters.shahar ? eq(users.shahar, filters.shahar) : undefined,
      filters.mahalla ? eq(users.mahalla, filters.mahalla) : undefined,
      filters.direction ? eq(users.direction, filters.direction) : undefined,
      searchCondition,
    ].filter(Boolean);

    const [row] = await db
      .select({ count: sql<number>`count(*)` })
      .from(users)
      .where(conditions.length ? and(...conditions) : undefined);
    return Number(row?.count ?? 0);
  }

  async findRecipientsForBroadcast(): Promise<User[]> {
    return db
      .select()
      .from(users)
      .where(
        and(
          eq(users.status, "approved"),
          eq(users.telegramStatus, "active"),
          sql`${users.telegramId} is not null`,
        ),
      );
  }
}

export const userRepository = new UserRepository();
