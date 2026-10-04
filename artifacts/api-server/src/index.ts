import app from "./app";
import { logger } from "./lib/logger";
import { startEmailSyncScheduler } from "./lib/email-sync-scheduler";
import { ensureSessionStore } from "./lib/session-store";

if (!process.env.SESSION_SECRET) {
  throw new Error("SESSION_SECRET environment variable is required but was not provided.");
}

const rawPort = process.env["PORT"];

if (!rawPort) {
  throw new Error(
    "PORT environment variable is required but was not provided.",
  );
}

const port = Number(rawPort);

if (Number.isNaN(port) || port <= 0) {
  throw new Error(`Invalid PORT value: "${rawPort}"`);
}

async function start() {
  await ensureSessionStore();
  app.listen(port, (err) => {
  if (err) {
    logger.error({ err }, "Error listening on port");
    process.exit(1);
  }

  logger.info({ port }, "Server listening");
  startEmailSyncScheduler();
  });
}

start().catch((err) => {
  logger.error({ err }, "Could not initialize the PostgreSQL session store");
  process.exit(1);
});
