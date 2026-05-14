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

// ── Rule-based email parser (same heuristics as the /sync route) ──────────────

const DOMAIN_TO_PLATFORM: Record<string, string> = {
  "linkedin.com": "linkedin",
  "indeed.com": "indeed",
  "glassdoor.com": "glassdoor",
  "angel.co": "wellfound",
  "wellfound.com": "wellfound",
  "greenhouse.io": "greenhouse",
  "lever.co": "lever",
  "workday.com": "workday",
  "ashbyhq.com": "ashby",
  "recruitee.com": "recruitee",
};

function senderToPlatform(from: string): string {
  const domain = from.replace(/.*@/, "").toLowerCase().trim();
  return DOMAIN_TO_PLATFORM[domain] ?? "other";
}

function isPromotionalEmail(subject: string, from: string): boolean {
  const subj = subject.toLowerCase();
  const frm = from.toLowerCase();
  if (/newsletter|unsubscribe|open position|job alert|new job|promotional/.test(subj)) return true;
  if (/marketing\.|newsletter\.|@campaigns\./.test(frm)) return true;
  return false;
}

function parseStatusFromSubject(subject: string): string {
  const s = subject.toLowerCase();
  if (/\b(offer|we.?d like to offer|congratulations.*offer|pleased to offer)\b/.test(s)) return "offer";
  if (/\b(interview|invited to interview|schedule.*interview|please.*schedule|phone screen|technical screen)\b/.test(s)) return "interview";
  if (/\b(shortlisted|moved forward|under review|reviewing your|screening|assessment)\b/.test(s)) return "screening";
  if (/\b(regret|not moving forward|unfortunately|not.*selected|we won.?t|no longer|unsuccessful)\b/.test(s)) return "rejected";
  return "applied";
}

function extractCompanyFromSubject(subject: string): string | null {
  // Match only consecutive Title-Case words after "at" — stops at lowercase words like "has", "been"
  const m = subject.match(/\bat\s+((?:[A-Z][A-Za-z0-9&.]+)(?:\s+[A-Z][A-Za-z0-9&.]+)*)/);
  return m ? m[1].trim() : null;
}

function extractJobTitleFromSubject(subject: string): string | null {
  // Match job title as consecutive Title-Case words (with hyphen support) after trigger phrases
  const m = subject.match(
    /(?:application\s+(?:to|for|received[:\s]+)|invitation[:\s]+|for\s+the)\s+((?:[A-Z][A-Za-z0-9&+./-]+)(?:\s+[A-Z][A-Za-z0-9&+./-]+)*)\s+at\b/i,
  );
  return m ? m[1].trim() : null;
}

interface InboxEmail {
  messageId: string;
  from: string;
  subject: string;
  receivedDate: string;
}

interface ParsedEmail {
  emailMessageId: string;
  jobTitle: string;
  companyName: string;
  platform: string;
  status: string;
  appliedDate: string;
}

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

const KNOWN_SENDER_DOMAINS = new Set([
  "linkedin.com", "indeed.com", "glassdoor.com", "angel.co", "wellfound.com",
  "greenhouse.io", "lever.co", "workday.com", "ashbyhq.com", "recruitee.com",
]);

function parseInboxEmails(emails: InboxEmail[]): ParsedEmail[] {
  return emails
    .filter((e) => {
      const domain = e.from.replace(/.*@/, "").toLowerCase().trim();
      return KNOWN_SENDER_DOMAINS.has(domain);
    })
    .filter((e) => !isPromotionalEmail(e.subject, e.from))
    .map((e) => ({
      emailMessageId: e.messageId,
      jobTitle: extractJobTitleFromSubject(e.subject) ?? "Software Engineer",
      companyName: extractCompanyFromSubject(e.subject) ?? "Unknown Company",
      platform: senderToPlatform(e.from),
      status: parseStatusFromSubject(e.subject),
      appliedDate: e.receivedDate,
    }));
}

// ── Profile sync ──────────────────────────────────────────────────────────────

async function syncProfileInbox(profileId: number): Promise<void> {
  const rawInbox = buildSyntheticInbox(profileId);
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
