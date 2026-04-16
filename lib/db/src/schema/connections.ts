import { pgTable, serial, integer, timestamp, unique, text } from "drizzle-orm/pg-core";

export const connectionsTable = pgTable("connections", {
  id: serial("id").primaryKey(),
  followerId: integer("follower_id").notNull(),
  followingId: integer("following_id").notNull(),
  status: text("status").notNull().default("pending"),
  requestMessage: text("request_message"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
}, (t) => ({
  uniquePair: unique().on(t.followerId, t.followingId),
}));

export type Connection = typeof connectionsTable.$inferSelect;
