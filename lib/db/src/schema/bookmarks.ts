import { pgTable, serial, integer, text, timestamp, unique } from "drizzle-orm/pg-core";

export const bookmarksTable = pgTable("bookmarks", {
  id: serial("id").primaryKey(),
  profileId: integer("profile_id").notNull(),
  itemType: text("item_type").notNull(),
  itemId: integer("item_id").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
}, (t) => ({
  uniqueBookmark: unique().on(t.profileId, t.itemType, t.itemId),
}));

export type Bookmark = typeof bookmarksTable.$inferSelect;
