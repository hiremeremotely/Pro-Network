import { eq, or, and } from "drizzle-orm";
import {
  db,
  profilesTable,
  externalApplicationsTable,
  notificationsTable,
} from "@workspace/db";
import { logger } from "./logger";
import { decryptToken } from "./crypto";
import {
  IS_DEMO,
  fetchGmailInbox,
  fetchOutlookInbox,
  getValidAccessToken,
  parseInboxEmails,
  type InboxEmail,
  type ParsedEmailApp,
} from "./email-provider";

const SYNC_INTERVAL_MS = 15 * 60 * 1000;

const VALID_STATUSES = new Set([
  "saved", "applied", "screening", "interview", "offer", "accepted", "rejected", "withdrawn",
]);


function buildSyntheticInbox(profileId: number): InboxEmail[] {
  const daysAgo = (n: number) =>
    new Date(Date.now() - n * 86400000).toISOString().split("T")[0];
  return [
    {
      messageId: `<${profileId}.001@mail.linkedin.com>`,
      from: "jobs-noreply@linkedin.com",
      subject: "Your application to Senior Frontend Engineer at Stripe has been received",
      receivedDate: daysAgo(5),
    },
    {
      messageId: `<${profileId}.002@app.indeed.com>`,
      from: "noreply@indeed.com",
      subject: "Application received: Full-Stack Developer at Notion",
      receivedDate: daysAgo(10),
    },
    {
      messageId: `<${profileId}.003@mail.wellfound.com>`,
      from: "noreply@wellfound.com",
      subject: "Interview invitation: React Engineer at Vercel",
      receivedDate: daysAgo(3),
    },
    {
      messageId: `<${profileId}.004@glassdoor.com>`,
      from: "noreply@glassdoor.com",
      subject: "We received your application for TypeScript Developer at Linear",
      receivedDate: daysAgo(7),
    },
    {
      messageId: `<${profileId}.005@greenhouse.io>`,
      from: "no-reply@greenhouse.io",
      subject: "Your application to Staff Backend Engineer at Cloudflare",
      receivedDate: daysAgo(12),
    },
    {
      messageId: `<${profileId}.006@lever.co>`,
      from: "noreply@lever.co",
      subject: "Application status update: Moving forward with your application at Figma",
      receivedDate: daysAgo(2),
    },
    // Promotional — filtered out
    {
      messageId: `<${profileId}.p1@newsletter.com>`,
      from: "newsletter@jobsalert.com",
      subject: "New job alert: 50 open positions in your area",
      receivedDate: daysAgo(1),
    },
  ];
}

interface ProfileTokens {
  gmailConnected: boolean;
  gmailToken: string | null;
  outlookConnected: boolean;
  outlookToken: string | null;
}

async function syncProfileInbox(profileId: number, tokens: ProfileTokens): Promise<void> {
  let rawInbox: InboxEmail[];
  if (!IS_DEMO) {
    rawInbox = [];
    if (tokens.gmailConnected && tokens.gmailToken) {
      const bundle = decryptToken(tokens.gmailToken);
      if (bundle) {
        try {
          const accessToken = await getValidAccessToken("gmail", bundle);
          rawInbox.push(...await fetchGmailInbox(accessToken));
        } catch (err) {
          logger.warn({ err, profileId }, "Email sync: Gmail fetch failed");
        }
      }
    }
    if (tokens.outlookConnected && tokens.outlookToken) {
      const bundle = decryptToken(tokens.outlookToken);
      if (bundle) {
        try {
          const accessToken = await getValidAccessToken("outlook", bundle);
          rawInbox.push(...await fetchOutlookInbox(accessToken));
        } catch (err) {
          logger.warn({ err, profileId }, "Email sync: Outlook fetch failed");
        }
      }
    }
  } else {
    rawInbox = buildSyntheticInbox(profileId);
  }
  const emails = parseInboxEmails(rawInbox);

  const existingRows = await db
    .select({
      id: externalApplicationsTable.id,
      emailMessageId: externalApplicationsTable.emailMessageId,
      status: externalApplicationsTable.status,
      statusHistory: externalApplicationsTable.statusHistory,
      jobTitle: externalApplicationsTable.jobTitle,
      companyName: externalApplicationsTable.companyName,
    })
    .from(externalApplicationsTable)
    .where(
      and(
        eq(externalApplicationsTable.profileId, profileId),
        eq(externalApplicationsTable.source, "email"),
      ),
    );

  // Only auto-import after the user has confirmed an initial import via the review flow.
  if (existingRows.length === 0) {
    logger.info({ profileId }, "Email sync: no baseline imports, skipping auto-import");
    return;
  }

  const existingByMessageId = new Map(
    existingRows
      .filter((r) => r.emailMessageId != null)
      .map((r) => [r.emailMessageId as string, r]),
  );

  for (const email of emails) {
    // Prefer exact messageId match; fall back to company+job correlation for status-update emails
    const existing =
      existingByMessageId.get(email.emailMessageId) ??
      existingRows.find(
        (r) =>
          r.jobTitle?.toLowerCase().trim() === email.jobTitle.toLowerCase().trim() &&
          r.companyName?.toLowerCase().trim() === email.companyName.toLowerCase().trim(),
      );

    if (!existing) {
      // Auto-import: silently insert the new application detected from email
      const validStatus = VALID_STATUSES.has(email.status) ? email.status : "applied";
      await db.insert(externalApplicationsTable).values({
        profileId,
        jobTitle: email.jobTitle,
        companyName: email.companyName,
        platform: email.platform,
        status: validStatus,
        appliedDate: email.appliedDate,
        source: "email",
        emailMessageId: email.emailMessageId,
        statusHistory: [{ status: validStatus, date: new Date().toISOString() }],
      });

      // Notify the user about the auto-imported application
      await db.insert(notificationsTable).values({
        recipientProfileId: profileId,
        actorProfileId: profileId,
        type: "email_import",
        message: `New application auto-imported: ${email.jobTitle} at ${email.companyName}`,
        isRead: false,
      });

      logger.info({ profileId, jobTitle: email.jobTitle, companyName: email.companyName },
        "Email sync: auto-imported new application");
      continue;
    }

    // Update status if changed
    if (existing.status !== email.status && VALID_STATUSES.has(email.status)) {
      const history = existing.statusHistory ?? [];
      await db
        .update(externalApplicationsTable)
        .set({
          status: email.status,
          statusHistory: [...history, { status: email.status, date: new Date().toISOString() }],
        })
        .where(eq(externalApplicationsTable.id, existing.id));

      await db.insert(notificationsTable).values({
        recipientProfileId: profileId,
        actorProfileId: profileId,
        type: "status_update",
        message: `Application status updated: ${email.jobTitle} at ${email.companyName} → ${email.status}`,
        isRead: false,
      });

      logger.info({ profileId, id: existing.id, from: existing.status, to: email.status },
        "Email sync: status updated");
    }
  }
}

async function runEmailSync(): Promise<void> {
  try {
    const connectedProfiles = await db
      .select({
        id: profilesTable.id,
        gmailConnected: profilesTable.gmailConnected,
        gmailToken: profilesTable.gmailToken,
        outlookConnected: profilesTable.outlookConnected,
        outlookToken: profilesTable.outlookToken,
      })
      .from(profilesTable)
      .where(
        or(
          eq(profilesTable.gmailConnected, true),
          eq(profilesTable.outlookConnected, true),
        ),
      );

    logger.info({ count: connectedProfiles.length }, "Email sync: scanning connected profiles");

    for (const { id, ...tokens } of connectedProfiles) {
      try {
        await syncProfileInbox(id, tokens as ProfileTokens);
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
