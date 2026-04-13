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
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
});

export const insertProfileSchema = createInsertSchema(profilesTable).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertProfile = z.infer<typeof insertProfileSchema>;
export type Profile = typeof profilesTable.$inferSelect;
