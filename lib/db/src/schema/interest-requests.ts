import { pgTable, serial, integer, text, timestamp, varchar, jsonb } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const interestRequestsTable = pgTable("interest_requests", {
  id: serial("id").primaryKey(),
  companyProfileId: integer("company_profile_id").notNull(),
  candidateProfileId: integer("candidate_profile_id").notNull(),
  jobId: integer("job_id"),
  status: varchar("status", { length: 20 }).notNull().default("pending"),
  companyNote: text("company_note"),
  roleTitle: text("role_title"),
  adminNote: text("admin_note"),
  releaseScope: jsonb("release_scope").$type<string[]>().notNull().default([]),
  conversationId: integer("conversation_id"),
  handlingMode: varchar("handling_mode", { length: 20 }).notNull().default("direct"),
  expiresAt: timestamp("expires_at", { withTimezone: true }),
  releaseExpiresAt: timestamp("release_expires_at", { withTimezone: true }),
  revokedAt: timestamp("revoked_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  respondedAt: timestamp("responded_at", { withTimezone: true }),
});

export const insertInterestRequestSchema = createInsertSchema(interestRequestsTable).omit({
  id: true,
  createdAt: true,
  respondedAt: true,
  status: true,
  adminNote: true,
});
export type InsertInterestRequest = z.infer<typeof insertInterestRequestSchema>;
export type InterestRequest = typeof interestRequestsTable.$inferSelect;
