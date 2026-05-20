import { pgTable, serial, integer, text, timestamp, varchar } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const interestRequestsTable = pgTable("interest_requests", {
  id: serial("id").primaryKey(),
  companyProfileId: integer("company_profile_id").notNull(),
  candidateProfileId: integer("candidate_profile_id").notNull(),
  jobId: integer("job_id"),
  status: varchar("status", { length: 20 }).notNull().default("pending"),
  companyNote: text("company_note"),
  adminNote: text("admin_note"),
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
