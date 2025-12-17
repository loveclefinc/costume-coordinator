import { eq } from "drizzle-orm";
import { drizzle } from "drizzle-orm/mysql2";
import { InsertUser, users } from "../drizzle/schema";
import { ENV } from "./_core/env";

let _db: ReturnType<typeof drizzle> | null = null;

// Lazily create the drizzle instance so local tooling can run without a DB.
export async function getDb() {
  if (!_db && process.env.DATABASE_URL) {
    try {
      _db = drizzle(process.env.DATABASE_URL);
    } catch (error) {
      console.warn("[Database] Failed to connect:", error);
      _db = null;
    }
  }
  return _db;
}

export async function upsertUser(user: InsertUser): Promise<void> {
  if (!user.openId) {
    throw new Error("User openId is required for upsert");
  }

  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot upsert user: database not available");
    return;
  }

  try {
    const values: InsertUser = {
      openId: user.openId,
    };
    const updateSet: Record<string, unknown> = {};

    const textFields = ["name", "email", "loginMethod"] as const;
    type TextField = (typeof textFields)[number];

    const assignNullable = (field: TextField) => {
      const value = user[field];
      if (value === undefined) return;
      const normalized = value ?? null;
      values[field] = normalized;
      updateSet[field] = normalized;
    };

    textFields.forEach(assignNullable);

    if (user.lastSignedIn !== undefined) {
      values.lastSignedIn = user.lastSignedIn;
      updateSet.lastSignedIn = user.lastSignedIn;
    }
    if (user.role !== undefined) {
      values.role = user.role;
      updateSet.role = user.role;
    } else if (user.openId === ENV.ownerOpenId) {
      values.role = "admin";
      updateSet.role = "admin";
    }

    if (!values.lastSignedIn) {
      values.lastSignedIn = new Date();
    }

    if (Object.keys(updateSet).length === 0) {
      updateSet.lastSignedIn = new Date();
    }

    await db.insert(users).values(values).onDuplicateKeyUpdate({
      set: updateSet,
    });
  } catch (error) {
    console.error("[Database] Failed to upsert user:", error);
    throw error;
  }
}

export async function getUserByOpenId(openId: string) {
  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot get user: database not available");
    return undefined;
  }

  const result = await db.select().from(users).where(eq(users.openId, openId)).limit(1);

  return result.length > 0 ? result[0] : undefined;
}

// ==================== Events ====================

import {
  events,
  eventParticipants,
  costumeSnapshots,
  optimizationResults,
  InsertEvent,
  InsertEventParticipant,
  InsertCostumeSnapshot,
  InsertOptimizationResult,
} from "../drizzle/schema";
import { and } from "drizzle-orm";

export async function createEvent(data: InsertEvent) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  await db.insert(events).values(data);
  // Get the last inserted ID
  const result = await db.select().from(events).orderBy(events.id).limit(1);
  return result[0]?.id || 0;
}

export async function getEventByInviteCode(inviteCode: string) {
  const db = await getDb();
  if (!db) return null;

  const result = await db.select().from(events).where(eq(events.inviteCode, inviteCode));
  return result[0] || null;
}

export async function getEventById(eventId: number) {
  const db = await getDb();
  if (!db) return null;

  const result = await db.select().from(events).where(eq(events.id, eventId));
  return result[0] || null;
}

export async function getUserEvents(userId: number) {
  const db = await getDb();
  if (!db) return [];

  // Get events created by user
  const createdEvents = await db.select().from(events).where(eq(events.createdByUserId, userId));

  // Get events user participated in
  const participations = await db
    .select()
    .from(eventParticipants)
    .where(eq(eventParticipants.userId, userId));

  const participatedEventIds = participations.map((p) => p.eventId);
  const participatedEvents =
    participatedEventIds.length > 0
      ? await db
          .select()
          .from(events)
          .where(eq(events.id, participatedEventIds[0]))
      : [];

  // Combine and deduplicate
  const allEvents = [...createdEvents, ...participatedEvents];
  const uniqueEvents = Array.from(new Map(allEvents.map((e) => [e.id, e])).values());

  return uniqueEvents;
}

export async function updateEventStatus(eventId: number, status: string) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  await db.update(events).set({ status }).where(eq(events.id, eventId));
}

// ==================== Event Participants ====================

export async function addParticipant(data: InsertEventParticipant) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  await db.insert(eventParticipants).values(data);
  const result = await db.select().from(eventParticipants).orderBy(eventParticipants.id).limit(1);
  return result[0]?.id || 0;
}

export async function getEventParticipants(eventId: number) {
  const db = await getDb();
  if (!db) return [];

  return db.select().from(eventParticipants).where(eq(eventParticipants.eventId, eventId));
}

export async function getParticipantByEventAndUser(eventId: number, userId: number) {
  const db = await getDb();
  if (!db) return null;

  const result = await db
    .select()
    .from(eventParticipants)
    .where(and(eq(eventParticipants.eventId, eventId), eq(eventParticipants.userId, userId)));

  return result[0] || null;
}

// ==================== Costume Snapshots ====================

export async function addCostumeSnapshot(data: InsertCostumeSnapshot) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  await db.insert(costumeSnapshots).values(data);
  const result = await db.select().from(costumeSnapshots).orderBy(costumeSnapshots.id).limit(1);
  return result[0]?.id || 0;
}

export async function getEventCostumeSnapshots(eventId: number) {
  const db = await getDb();
  if (!db) return [];

  return db.select().from(costumeSnapshots).where(eq(costumeSnapshots.eventId, eventId));
}

export async function getParticipantCostumeSnapshots(participantId: number) {
  const db = await getDb();
  if (!db) return [];

  return db
    .select()
    .from(costumeSnapshots)
    .where(eq(costumeSnapshots.participantId, participantId));
}

export async function deleteCostumeSnapshot(snapshotId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  await db.delete(costumeSnapshots).where(eq(costumeSnapshots.id, snapshotId));
}

// ==================== Optimization Results ====================

export async function saveOptimizationResult(data: InsertOptimizationResult) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  await db.insert(optimizationResults).values(data);
  const result = await db.select().from(optimizationResults).orderBy(optimizationResults.id).limit(1);
  return result[0]?.id || 0;
}

export async function getLatestOptimizationResult(eventId: number) {
  const db = await getDb();
  if (!db) return null;

  const result = await db
    .select()
    .from(optimizationResults)
    .where(eq(optimizationResults.eventId, eventId));

  return result[result.length - 1] || null;
}

export async function deleteOptimizationResults(eventId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  await db.delete(optimizationResults).where(eq(optimizationResults.eventId, eventId));
}
