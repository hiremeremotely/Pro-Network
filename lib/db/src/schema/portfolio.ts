import { pgTable, text, serial, integer, boolean, timestamp, index, uniqueIndex } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { profilesTable } from "./profiles";

export const portfolioTable = pgTable("portfolio", {
  id: serial("id").primaryKey(),
  profileId: integer("profile_id").notNull().references(() => profilesTable.id, { onDelete: "cascade" }),
  title: text("title").notNull(),
  description: text("description"),
  projectUrl: text("project_url"),
  imageUrl: text("image_url"),
  tags: text("tags").array().notNull().default([]),
  featured: boolean("featured").notNull().default(false),
  source: text("source").notNull().default("manual"),
  externalId: text("external_id"),
  canonicalUrl: text("canonical_url"),
  objectPath: text("object_path"),
  mimeType: text("mime_type"),
  fileSize: integer("file_size"),
  visibility: text("visibility").notNull().default("public"),
  sortOrder: integer("sort_order").notNull().default(0),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
}, (table) => ({
  profileSourceExternal: uniqueIndex("portfolio_profile_source_external_idx").on(table.profileId, table.source, table.externalId),
  profileSort: index("portfolio_profile_sort_idx").on(table.profileId, table.sortOrder),
}));

export const insertPortfolioSchema = createInsertSchema(portfolioTable).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertPortfolio = z.infer<typeof insertPortfolioSchema>;
export type Portfolio = typeof portfolioTable.$inferSelect;

export const portfolioUploadTicketsTable = pgTable("portfolio_upload_tickets", {
  id: serial("id").primaryKey(),
  profileId: integer("profile_id").notNull().references(() => profilesTable.id, { onDelete: "cascade" }),
  objectPath: text("object_path").notNull().unique(),
  originalName: text("original_name").notNull(),
  declaredMimeType: text("declared_mime_type").notNull(),
  declaredSize: integer("declared_size").notNull(),
  status: text("status").notNull().default("pending"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
});
