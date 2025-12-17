import { int, mysqlEnum, mysqlTable, text, timestamp, varchar } from "drizzle-orm/mysql-core";

/**
 * Core user table backing auth flow.
 * Extend this file with additional tables as your product grows.
 * Columns use camelCase to match both database fields and generated types.
 */
export const users = mysqlTable("users", {
  /**
   * Surrogate primary key. Auto-incremented numeric value managed by the database.
   * Use this for relations between tables.
   */
  id: int("id").autoincrement().primaryKey(),
  /** Manus OAuth identifier (openId) returned from the OAuth callback. Unique per user. */
  openId: varchar("openId", { length: 64 }).notNull().unique(),
  name: text("name"),
  email: varchar("email", { length: 320 }),
  loginMethod: varchar("loginMethod", { length: 64 }),
  role: mysqlEnum("role", ["user", "admin"]).default("user").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  lastSignedIn: timestamp("lastSignedIn").defaultNow().notNull(),
});

export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;

/**
 * Events table - stores event information and conditions
 */
export const events = mysqlTable("events", {
  id: int("id").autoincrement().primaryKey(),
  name: varchar("name", { length: 255 }).notNull(),
  eventDate: timestamp("eventDate").notNull(),
  createdByUserId: int("createdByUserId").notNull(),
  inviteCode: varchar("inviteCode", { length: 64 }).notNull().unique(),
  conditions: text("conditions").notNull(), // JSON string
  status: varchar("status", { length: 50 }).default("active").notNull(),
  expiresAt: timestamp("expiresAt").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type Event = typeof events.$inferSelect;
export type InsertEvent = typeof events.$inferInsert;

/**
 * Event participants table - tracks who joined which event
 */
export const eventParticipants = mysqlTable("event_participants", {
  id: int("id").autoincrement().primaryKey(),
  eventId: int("eventId").notNull(),
  userId: int("userId").notNull(),
  displayName: varchar("displayName", { length: 255 }).notNull(),
  joinedAt: timestamp("joinedAt").defaultNow().notNull(),
});

export type EventParticipant = typeof eventParticipants.$inferSelect;
export type InsertEventParticipant = typeof eventParticipants.$inferInsert;

/**
 * Costume snapshots table - stores costume metadata for events
 */
export const costumeSnapshots = mysqlTable("costume_snapshots", {
  id: int("id").autoincrement().primaryKey(),
  eventId: int("eventId").notNull(),
  participantId: int("participantId").notNull(),
  costumeData: text("costumeData").notNull(), // JSON string
  priority: int("priority").notNull(), // 1-5
  thumbnailUrl: text("thumbnailUrl"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type CostumeSnapshot = typeof costumeSnapshots.$inferSelect;
export type InsertCostumeSnapshot = typeof costumeSnapshots.$inferInsert;

/**
 * Optimization results table - caches optimization results
 */
export const optimizationResults = mysqlTable("optimization_results", {
  id: int("id").autoincrement().primaryKey(),
  eventId: int("eventId").notNull(),
  resultData: text("resultData").notNull(), // JSON string
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type OptimizationResult = typeof optimizationResults.$inferSelect;
export type InsertOptimizationResult = typeof optimizationResults.$inferInsert;
