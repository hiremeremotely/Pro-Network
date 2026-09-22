import { pgTable, serial, integer, text, jsonb, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const hmrAuditEventsTable = pgTable("hmr_audit_events", {
  id: serial("id").primaryKey(),
  interestRequestId: integer("interest_request_id"),
  actorProfileId: integer("actor_profile_id"),
  actorRole: text("actor_role").notNull(),
  event: text("event").notNull(),
  metadata: jsonb("metadata").$type<Record<string, unknown>>().notNull().default({}),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});
export const insertHmrAuditEventSchema = createInsertSchema(hmrAuditEventsTable).omit({ id: true, createdAt: true });
export type InsertHmrAuditEvent = z.infer<typeof insertHmrAuditEventSchema>;
export type HmrAuditEvent = typeof hmrAuditEventsTable.$inferSelect;