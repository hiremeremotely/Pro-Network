import { pgTable, text, serial, integer, timestamp, jsonb } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { profilesTable } from "./profiles";

export interface StatusHistoryEntry {
  status: string;
  date: string;
}

export const externalApplicationsTable = pgTable("external_applications", {
  id: serial("id").primaryKey(),
  profileId: integer("profile_id").notNull().references(() => profilesTable.id, { onDelete: "cascade" }),
  jobTitle: text("job_title").notNull(),
  companyName: text("company_name").notNull(),
  platform: text("platform").notNull().default("other"),
  jobUrl: text("job_url"),
  status: text("status").notNull().default("applied"),
  appliedDate: text("applied_date"),
  location: text("location"),
  salaryMin: integer("salary_min"),
  salaryMax: integer("salary_max"),
  notes: text("notes"),
  emailMessageId: text("email_message_id"),
  source: text("source").notNull().default("manual"),
  statusHistory: jsonb("status_history").$type<StatusHistoryEntry[]>(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
});

export const insertExternalApplicationSchema = createInsertSchema(externalApplicationsTable).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertExternalApplication = z.infer<typeof insertExternalApplicationSchema>;
export type ExternalApplication = typeof externalApplicationsTable.$inferSelect;
