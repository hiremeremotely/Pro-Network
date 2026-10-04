import { pool } from "@workspace/db";

export async function ensureSessionStore(): Promise<void> {
  // connect-pg-simple's auto-create reads table.sql, which esbuild doesn't copy.
  // Explicit, idempotent DDL preserves existing sessions on every deployment.
  await pool.query(`
    CREATE TABLE IF NOT EXISTS sessions (
      sid varchar NOT NULL PRIMARY KEY,
      sess json NOT NULL,
      expire timestamp(6) NOT NULL
    );
    CREATE INDEX IF NOT EXISTS "IDX_sessions_expire" ON sessions (expire);
  `);
}