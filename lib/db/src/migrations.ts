import { createHash } from "node:crypto";
import { readdir, readFile } from "node:fs/promises";
import { join } from "node:path";
import type { PoolClient } from "pg";

export interface DatabaseMigration {
  name: string;
  checksum: string;
  sql: string;
}

export class DatabaseMigrationError extends Error {
  override name = "DatabaseMigrationError";
}

export async function readDatabaseMigrations(directory: string): Promise<DatabaseMigration[]> {
  const names = (await readdir(directory)).filter(name => name.endsWith(".sql")).sort();
  if (!names.length) throw new DatabaseMigrationError("No SQL migrations found in the image.");
  const migrations: DatabaseMigration[] = [];
  for (const name of names) {
    if (!/^\d{4}_[a-z0-9_]+\.sql$/.test(name)) {
      throw new DatabaseMigrationError("SQL migration filenames must use a numeric prefix and safe lowercase name.");
    }
    const sql = await readFile(join(directory, name), "utf8");
    if (!sql.trim()) throw new DatabaseMigrationError(`Empty migration: ${name}`);
    // Conservative guard: these files run inside ONE runner-owned transaction.
    // Never allow a file to commit it early or request nontransactional indexes.
    const statements = sql.replace(/--[^\n]*/g, "").replace(/\/\*[\s\S]*?\*\//g, "");
    if (/(?:^|;)\s*(?:BEGIN|START\s+TRANSACTION|COMMIT|ROLLBACK|END\s+TRANSACTION)\b/i.test(statements)
        || /\bCREATE\s+(?:UNIQUE\s+)?INDEX\s+CONCURRENTLY\b/i.test(statements)) {
      throw new DatabaseMigrationError(`Migration must use the runner-owned transaction: ${name}`);
    }
    migrations.push({ name, sql, checksum: createHash("sha256").update(sql).digest("hex") });
  }
  return migrations;
}

// All pending SQL and ledger entries commit together. The transaction-scoped
// advisory lock also serializes tasks started by retries or separate operators.
export async function runDatabaseMigrations(
  client: Pick<PoolClient, "query">,
  migrations: DatabaseMigration[],
): Promise<string[]> {
  await client.query("BEGIN");
  try {
    await client.query("SET LOCAL lock_timeout = '30s'");
    await client.query("SET LOCAL statement_timeout = '3min'");
    await client.query("SET LOCAL search_path TO public");
    await client.query("SELECT pg_advisory_xact_lock(19460203)");
    await client.query(`
      CREATE TABLE IF NOT EXISTS public.hmr_schema_migrations (
        name text PRIMARY KEY,
        checksum text NOT NULL,
        applied_at timestamptz NOT NULL DEFAULT now()
      )
    `);
    const { rows } = await client.query<{ name: string; checksum: string }>(
      "SELECT name, checksum FROM public.hmr_schema_migrations",
    );
    const recorded = new Map(rows.map(row => [row.name, row.checksum]));
    const available = new Map(migrations.map(migration => [migration.name, migration]));
    for (const [name, checksum] of recorded) {
      const migration = available.get(name);
      if (!migration) throw new DatabaseMigrationError("The database has an applied migration absent from this image.");
      if (migration.checksum !== checksum) {
        throw new DatabaseMigrationError(`Applied migration was modified: ${migration.name}`);
      }
    }
    const applied: string[] = [];
    for (const migration of migrations) {
      if (recorded.has(migration.name)) continue;
      try {
        await client.query(migration.sql);
      } catch (cause) {
        throw new DatabaseMigrationError(`Migration SQL failed: ${migration.name}`, { cause });
      }
      await client.query(
        "INSERT INTO public.hmr_schema_migrations (name, checksum) VALUES ($1, $2)",
        [migration.name, migration.checksum],
      );
      applied.push(migration.name);
    }
    await client.query("COMMIT");
    return applied;
  } catch (error) {
    try { await client.query("ROLLBACK"); } catch { /* Connection loss already aborts its transaction. */ }
    throw error;
  }
}