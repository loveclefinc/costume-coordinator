import { z } from "zod";
import { COOKIE_NAME } from "../shared/const.js";
import { getSessionCookieOptions } from "./_core/cookies";
import { systemRouter } from "./_core/systemRouter";
import { publicProcedure, protectedProcedure, router } from "./_core/trpc";
import * as db from "./db";
import { optimizeCostumes, CostumeData, EventConditions } from "../lib/optimizer";

/**
 * Generate random invite code
 */
function generateInviteCode(): string {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
  let code = "";
  for (let i = 0; i < 32; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
}

export const appRouter = router({
  // if you need to use socket.io, read and register route in server/_core/index.ts, all api should start with '/api/' so that the gateway can route correctly
  system: systemRouter,
  auth: router({
    me: publicProcedure.query((opts) => opts.ctx.user),
    logout: publicProcedure.mutation(({ ctx }) => {
      const cookieOptions = getSessionCookieOptions(ctx.req);
      ctx.res.clearCookie(COOKIE_NAME, { ...cookieOptions, maxAge: -1 });
      return {
        success: true,
      } as const;
    }),
  }),

  // ==================== Events ====================
  events: router({
    // Create new event
    create: protectedProcedure
      .input(
        z.object({
          name: z.string().min(1).max(255),
          eventDate: z.string(), // ISO date string
          conditions: z.object({
            colorPreferences: z.array(z.array(z.string())).optional(),
            tonePreferences: z.array(z.enum(["pastel", "vivid", "dark", "neutral"])).optional(),
            patternPreferences: z.array(z.enum(["solid", "floral", "stripe", "dot", "check", "geometric", "animal", "other"])).optional(),
            avoidSimilarColors: z.boolean(),
            recentUsageExcludeDays: z.number().default(30),
          }),
        }),
      )
      .mutation(async ({ ctx, input }) => {
        const inviteCode = generateInviteCode();
        const eventDate = new Date(input.eventDate);
        const expiresAt = new Date(eventDate);
        expiresAt.setDate(expiresAt.getDate() + 14);

        const eventId = await db.createEvent({
          name: input.name,
          eventDate,
          createdByUserId: ctx.user.id,
          inviteCode,
          conditions: JSON.stringify(input.conditions),
          status: "active",
          expiresAt,
        });

        await db.addParticipant({
          eventId,
          userId: ctx.user.id,
          displayName: ctx.user.name || ctx.user.email || "参加者",
        });

        return { eventId, inviteCode };
      }),

    getByInviteCode: publicProcedure
      .input(z.object({ inviteCode: z.string() }))
      .query(async ({ input }) => {
        const event = await db.getEventByInviteCode(input.inviteCode);
        if (!event) throw new Error("Event not found");
        const participants = await db.getEventParticipants(event.id);
        return { ...event, conditions: JSON.parse(event.conditions), participants };
      }),

    list: protectedProcedure.query(async ({ ctx }) => {
      const events = await db.getUserEvents(ctx.user.id);
      return events.map((event) => ({ ...event, conditions: JSON.parse(event.conditions) }));
    }),

    join: protectedProcedure
      .input(z.object({ inviteCode: z.string() }))
      .mutation(async ({ ctx, input }) => {
        const event = await db.getEventByInviteCode(input.inviteCode);
        if (!event) throw new Error("Event not found");
        const existing = await db.getParticipantByEventAndUser(event.id, ctx.user.id);
        if (existing) return { participantId: existing.id };
        const participantId = await db.addParticipant({
          eventId: event.id,
          userId: ctx.user.id,
          displayName: ctx.user.name || ctx.user.email || "参加者",
        });
        return { participantId };
      }),
  }),

  // ==================== Costume Snapshots ====================
  costumes: router({
    submit: protectedProcedure
      .input(
        z.object({
          eventId: z.number(),
          costumes: z.array(
            z.object({
              costumeData: z.object({
                name: z.string(),
                colors: z.object({ primary: z.string(), secondary: z.string().optional() }),
                colorCategory: z.enum(["warm", "cool", "neutral"]),
                tone: z.enum(["pastel", "vivid", "dark", "neutral"]),
                pattern: z.enum(["solid", "floral", "stripe", "dot", "other"]),
                tags: z.array(z.string()),
                lastUsedDate: z.string().optional(),
              }),
              priority: z.number().min(1).max(5),
              thumbnailUrl: z.string().optional(),
            }),
          ),
        }),
      )
      .mutation(async ({ ctx, input }) => {
        const participant = await db.getParticipantByEventAndUser(input.eventId, ctx.user.id);
        if (!participant) throw new Error("Not a participant");
        const existing = await db.getParticipantCostumeSnapshots(participant.id);
        for (const snapshot of existing) await db.deleteCostumeSnapshot(snapshot.id);
        const snapshotIds = [];
        for (const costume of input.costumes) {
          const snapshotId = await db.addCostumeSnapshot({
            eventId: input.eventId,
            participantId: participant.id,
            costumeData: JSON.stringify(costume.costumeData),
            priority: costume.priority,
            thumbnailUrl: costume.thumbnailUrl,
          });
          snapshotIds.push(snapshotId);
        }
        return { snapshotIds };
      }),

    getByEvent: publicProcedure.input(z.object({ eventId: z.number() })).query(async ({ input }) => {
      const snapshots = await db.getEventCostumeSnapshots(input.eventId);
      return snapshots.map((s) => ({ ...s, costumeData: JSON.parse(s.costumeData) }));
    }),
  }),

  // ==================== Optimization ====================
  optimization: router({
    run: publicProcedure
      .input(z.object({ eventId: z.number() }))
      .mutation(async ({ input }) => {
        const event = await db.getEventById(input.eventId);
        if (!event) throw new Error("Event not found");
        const conditions: EventConditions = JSON.parse(event.conditions);
        const snapshots = await db.getEventCostumeSnapshots(input.eventId);
        const participants = await db.getEventParticipants(input.eventId);
        const participantMap = new Map(participants.map((p) => [p.id, p]));
        const costumes: CostumeData[] = snapshots.map((snapshot) => {
          const participant = participantMap.get(snapshot.participantId);
          const costumeData = JSON.parse(snapshot.costumeData);
          return {
            id: snapshot.id,
            participantId: snapshot.participantId,
            participantName: participant?.displayName || "参加者",
            costumeName: costumeData.name,
            priority: snapshot.priority,
            colors: costumeData.colors,
            colorCategory: costumeData.colorCategory,
            tone: costumeData.tone,
            pattern: costumeData.pattern,
            lastUsedDate: costumeData.lastUsedDate,
            thumbnailUrl: snapshot.thumbnailUrl || undefined,
          };
        });
        const proposals = optimizeCostumes(costumes, conditions, 5);
        const resultData = { proposals, generatedAt: new Date().toISOString() };
        await db.saveOptimizationResult({
          eventId: input.eventId,
          resultData: JSON.stringify(resultData),
        });
        return resultData;
      }),

    getLatest: publicProcedure.input(z.object({ eventId: z.number() })).query(async ({ input }) => {
      const result = await db.getLatestOptimizationResult(input.eventId);
      return result ? JSON.parse(result.resultData) : null;
    }),
  }),
});

export type AppRouter = typeof appRouter;
