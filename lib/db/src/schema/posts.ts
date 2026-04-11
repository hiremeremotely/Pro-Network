import { pgTable, text, serial, integer, timestamp, varchar, unique, boolean } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const postsTable = pgTable("posts", {
  id: serial("id").primaryKey(),
  profileId: integer("profile_id").notNull(),
  content: text("content").notNull(),
  imageUrl: text("image_url"),
  likesCount: integer("likes_count").notNull().default(0),
  commentsCount: integer("comments_count").notNull().default(0),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
});

export const postReactionsTable = pgTable("post_reactions", {
  id: serial("id").primaryKey(),
  postId: integer("post_id").notNull().references(() => postsTable.id, { onDelete: "cascade" }),
  profileId: integer("profile_id").notNull(),
  reactionType: varchar("reaction_type", { length: 20 }).notNull().default("like"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
}, (t) => ({
  uniqueUserPost: unique().on(t.postId, t.profileId),
}));

export const postCommentsTable = pgTable("post_comments", {
  id: serial("id").primaryKey(),
  postId: integer("post_id").notNull().references(() => postsTable.id, { onDelete: "cascade" }),
  profileId: integer("profile_id").notNull(),
  content: text("content").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
});

export const notificationsTable = pgTable("notifications", {
  id: serial("id").primaryKey(),
  recipientProfileId: integer("recipient_profile_id").notNull(),
  actorProfileId: integer("actor_profile_id").notNull(),
  type: varchar("type", { length: 20 }).notNull(),
  postId: integer("post_id"),
  reactionType: varchar("reaction_type", { length: 20 }),
  message: text("message").notNull(),
  isRead: boolean("is_read").notNull().default(false),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const insertPostSchema = createInsertSchema(postsTable).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertPost = z.infer<typeof insertPostSchema>;
export type Post = typeof postsTable.$inferSelect;
export type PostReaction = typeof postReactionsTable.$inferSelect;
export type PostComment = typeof postCommentsTable.$inferSelect;
export type Notification = typeof notificationsTable.$inferSelect;
