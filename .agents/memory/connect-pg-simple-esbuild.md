---
name: connect-pg-simple esbuild bundle issue
description: createTableIfMissing:true fails in esbuild bundles because the bundled table.sql asset is not copied to dist/.
---

# connect-pg-simple + esbuild: createTableIfMissing doesn't work

## The rule
Do NOT use `createTableIfMissing: true` when bundling with esbuild. The library reads its own `table.sql` from the package directory at runtime, but esbuild does not copy static asset files into the output bundle.

**Why:** `PGStore._rawEnsureSessionStoreTable` opens `<dist>/table.sql` (relative to the compiled output), which doesn't exist after esbuild bundles the JS. The session store silently fails to save/retrieve sessions — the cookie is issued but nothing is written to the DB, so every subsequent request returns 401.

**How to apply:** Create the sessions table once via raw SQL (see connect-pg-simple README for schema), then omit `createTableIfMissing`. Add the DDL to a migration or post-merge script so it runs on fresh environments.

```sql
CREATE TABLE IF NOT EXISTS "sessions" (
  "sid" varchar NOT NULL COLLATE "default",
  "sess" json NOT NULL,
  "expire" timestamp(6) NOT NULL,
  PRIMARY KEY ("sid") NOT DEFERRABLE INITIALLY IMMEDIATE
);
CREATE INDEX IF NOT EXISTS "IDX_sessions_expire" ON "sessions" ("expire");
```
