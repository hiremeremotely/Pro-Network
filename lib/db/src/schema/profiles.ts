import { pgTable, text, serial, timestamp, boolean } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const profilesTable = pgTable("profiles", {
  id: serial("id").primaryKey(),
  accountType: text("account_type").notNull().default("individual"),
  name: text("name").notNull(),
  email: text("email").unique(),
  passwordHash: text("password_hash"),
  headline: text("headline").notNull(),
  bio: text("bio"),
  location: text("location"),
  industry: text("industry"),
  avatarUrl: text("avatar_url"),
  coverUrl: text("cover_url"),
  website: text("website"),
  linkedinUrl: text("linkedin_url"),
  githubUrl: text("github_url"),
  twitterUrl: text("twitter_url"),
  interests: text("interests").array().notNull().default([]),
  openToWork: boolean("open_to_work").notNull().default(false),
  indeedUrl: text("indeed_url"),
  glassdoorUrl: text("glassdoor_url"),
  wellfoundUrl: text("wellfound_url"),
  angellistUrl: text("angellist_url"),
  gmailConnected: boolean("gmail_connected").notNull().default(false),
  outlookConnected: boolean("outlook_connected").notNull().default(false),
  gmailToken: text("gmail_token"),
  outlookToken: text("outlook_token"),
  resetToken: text("reset_token"),
  resetTokenExpiry: timestamp("reset_token_expiry", { withTimezone: true }),
  emailVerified: boolean("email_verified").notNull().default(true),
  emailVerificationToken: text("email_verification_token"),
  emailVerificationTokenExpiry: timestamp("email_verification_token_expiry", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
});

export const insertProfileSchema = createInsertSchema(profilesTable).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertProfile = z.infer<typeof insertProfileSchema>;
export type Profile = typeof profilesTable.$inferSelect;
