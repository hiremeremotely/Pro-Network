import { pgTable, text, serial, integer, timestamp } from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";
import { profilesTable } from "./profiles";
import { applicationsTable } from "./applications";

export const offerLettersTable = pgTable("offer_letters", {
  id: serial("id").primaryKey(),
  applicationId: integer("application_id").notNull().references(() => applicationsTable.id, { onDelete: "cascade" }),
  companyProfileId: integer("company_profile_id").notNull().references(() => profilesTable.id, { onDelete: "cascade" }),
  candidateProfileId: integer("candidate_profile_id").notNull().references(() => profilesTable.id, { onDelete: "cascade" }),
  templateName: text("template_name").notNull().default("full-time"),
  renderedHtml: text("rendered_html").notNull(),
  token: text("token").notNull().unique().default(sql`gen_random_uuid()::text`),
  status: text("status").notNull().default("draft"),
  sentAt: timestamp("sent_at", { withTimezone: true }),
  signedAt: timestamp("signed_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export type OfferLetter = typeof offerLettersTable.$inferSelect;
