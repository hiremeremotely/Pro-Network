import { eq, or, and } from "drizzle-orm";
import {
  db,
  profilesTable,
  externalApplicationsTable,
  notificationsTable,
} from "@workspace/db";
import { logger } from "./logger";

const SYNC_INTERVAL_MS = 15 * 60 * 1000;

const VALID_STATUSES = new Set([
  "saved", "applied", "screening", "interview", "offer", "accepted", "rejected", "withdrawn",
]);

interface SyncEmail {
  emailMessageId: string;
  jobTitle: string;
  companyName: string;
  platform: string;
  status: string;
  appliedDate: string;
  source: "email";
}

function buildMockEmails(profileId: number): SyncEmail[] {
  const d = (daysAgo: number) =>
    new Date(Date.now() - daysAgo * 86400000).toISOString().split("T")[0];
  return [
    { emailMessageId: `msg_${profileId}_001`, jobTitle: "Senior Frontend Engineer",
      companyName: "Stripe", platform: "linkedin", status: "screening",
      appliedDate: d(5), source: "email" },
    { emailMessageId: `msg_${profileId}_002`, jobTitle: "Full-Stack Developer",
      companyName: "Notion", platform: "indeed", status: "applied",
      appliedDate: d(10), source: "email" },
    { emailMessageId: `msg_${profileId}_003`, jobTitle: "React Engineer",
      companyName: "Vercel", platform: "wellfound", status: "interview",
      appliedDate: d(3), source: "email" },
    { emailMessageId: `msg_${profileId}_004`, jobTitle: "TypeScript Developer",
      companyName: "Linear", platform: "glassdoor", status: "applied",
      appliedDate: d(7), source: "email" },
  ];
}

async function syncProfileInbox(profileId: number): Promise<void> {
  const emails = buildMockEmails(profileId);

  const existingRows = await db
    .select({
      id: externalApplicationsTable.id,
      emailMessageId: externalApplicationsTable.emailMessageId,
      status: externalApplicationsTable.status,
    })
    .from(externalApplicationsTable)
    .where(
      and(
        eq(externalApplicationsTable.profileId, profileId),
        eq(externalApplicationsTable.source, "email"),
      ),
    );

  const existingMap = new Map(
    existingRows
      .filter((r) => r.emailMessageId != null)
      .map((r) => [r.emailMessageId as string, r]),
  );

  for (const email of emails) {
    const existing = existingMap.get(email.emailMessageId);

    if (!existing) {
      await db.insert(notificationsTable).values({
        recipientProfileId: profileId,
        actorProfileId: profileId,
        type: "email_import",
        message: `Email sync found a new application: ${email.jobTitle} at ${email.companyName}`,
        isRead: false,
      });
      continue;
    }

    if (existing.status !== email.status && VALID_STATUSES.has(email.status)) {
      await db
        .update(externalApplicationsTable)
        .set({ status: email.status })
        .where(eq(externalApplicationsTable.id, existing.id));

      await db.insert(notificationsTable).values({
        recipientProfileId: profileId,
        actorProfileId: profileId,
        type: "status_update",
        message: `Application status updated: ${email.jobTitle} at ${email.companyName} → ${email.status}`,
        isRead: false,
      });
    }
  }
}

async function runEmailSync(): Promise<void> {
  try {
    const connectedProfiles = await db
      .select({ id: profilesTable.id })
      .from(profilesTable)
      .where(
        or(
          eq(profilesTable.gmailConnected, true),
          eq(profilesTable.outlookConnected, true),
        ),
      );

    logger.info({ count: connectedProfiles.length }, "Email sync: scanning connected profiles");

    for (const { id } of connectedProfiles) {
      try {
        await syncProfileInbox(id);
      } catch (err) {
        logger.error({ err, profileId: id }, "Email sync: failed for profile");
      }
    }
  } catch (err) {
    logger.error({ err }, "Email sync: scheduler run failed");
  }
}

export function startEmailSyncScheduler(): void {
  logger.info({ intervalMs: SYNC_INTERVAL_MS }, "Email sync scheduler started");
  setInterval(() => {
    void runEmailSync();
  }, SYNC_INTERVAL_MS);
}
