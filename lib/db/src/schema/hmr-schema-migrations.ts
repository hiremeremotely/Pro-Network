import { pgTable, text, timestamp } from "drizzle-orm/pg-core";

// Keep the deployment ledger visible to schema tooling so a later reviewed
// schema push does not mistakenly treat it as an unknown table to remove.
export const hmrSchemaMigrationsTable = pgTable("hmr_schema_migrations", {
  name: text("name").primaryKey(),
  checksum: text("checksum").notNull(),
  appliedAt: timestamp("applied_at", { withTimezone: true }).notNull().defaultNow(),
});