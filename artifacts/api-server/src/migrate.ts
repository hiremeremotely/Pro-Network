import { DatabaseMigrationError, pool, readDatabaseMigrations, runDatabaseMigrations } from "@workspace/db";
import { logger } from "./lib/logger";

// The startup wrapper loads AWS secrets and validates TLS before this module
// is imported. This entry point never imports Express or opens an HTTP port.
pool.options.connectionTimeoutMillis = 15_000;
const watchdog = setTimeout(() => {
  logger.error("Migration exceeded its 18-minute limit; aborting the task.");
  process.exit(1); // PostgreSQL rolls back when this process's connection closes.
}, 18 * 60_000);
watchdog.unref();

try {
  const migrations = await readDatabaseMigrations("/app/migrations");
  logger.info({ migrations: migrations.map(migration => migration.name) }, "Checking database migrations");
  const client = await pool.connect();
  try {
    const applied = await runDatabaseMigrations(client, migrations);
    logger.info({ applied, count: applied.length }, "Database migrations committed");
  } finally {
    client.release();
  }
} catch (error) {
  // Do not serialize database errors: their details can include row data or
  // connection information. SQLSTATE plus CloudWatch context is safe to report.
  const dbError = error instanceof DatabaseMigrationError ? error.cause : error;
  const code = typeof dbError === "object" && dbError !== null && "code" in dbError
    && typeof dbError.code === "string" && /^[A-Z0-9]{5}$/.test(dbError.code)
    ? dbError.code : undefined;
  const reason = error instanceof DatabaseMigrationError ? error.message : undefined;
  logger.error({ code, reason }, "Database migration failed; deployment blocked. Check migration SQL and database permissions.");
  process.exitCode = 1;
} finally {
  await pool.end();
  clearTimeout(watchdog);
}