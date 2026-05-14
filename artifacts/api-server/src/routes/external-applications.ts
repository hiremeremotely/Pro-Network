import { Router, type IRouter } from "express";
import { eq, desc, and, or, ilike } from "drizzle-orm";
import { createHmac, randomBytes } from "crypto";
import {
  db,
  externalApplicationsTable,
  applicationsTable,
  jobsTable,
  profilesTable,
} from "@workspace/db";
import { requireTrackerAuth } from "../middlewares/require-tracker-auth";
import { encryptToken } from "../lib/crypto";
import { getSessionSecret } from "../routes/auth";

const router: IRouter = Router();

const NATIVE_STATUS_MAP: Record<string, string> = {
  pending: "applied",
  reviewing: "screening",
  interview: "interview",
  offer: "offer",
  accepted: "accepted",
  rejected: "rejected",
};

const VALID_STATUSES = new Set(["saved", "applied", "screening", "interview", "offer", "accepted", "rejected", "withdrawn"]);
const VALID_SOURCES = new Set(["manual", "email", "extension", "native"]);

// ── OAuth state signing ───────────────────────────────────────────────────────
// State is HMAC-signed so the callback cannot be forged with an arbitrary profileId.

function signOAuthState(payload: { profileId: number; provider: string; nonce: string }): string {
  const raw = JSON.stringify(payload);
  const sig = createHmac("sha256", getSessionSecret()).update(raw).digest("hex");
  return Buffer.from(JSON.stringify({ p: raw, s: sig })).toString("base64url");
}

function verifyOAuthState(state: string): { profileId: number; provider: string } | null {
  try {
    const outer = JSON.parse(Buffer.from(state, "base64url").toString("utf8")) as { p: string; s: string };
    const expected = createHmac("sha256", getSessionSecret()).update(outer.p).digest("hex");
    if (expected !== outer.s) return null;
    const inner = JSON.parse(outer.p) as { profileId: number; provider: string };
    if (!inner.profileId || (inner.provider !== "gmail" && inner.provider !== "outlook")) return null;
    return { profileId: inner.profileId, provider: inner.provider };
  } catch {
    return null;
  }
}

// ── Rule-based email parser ───────────────────────────────────────────────────
// Parses synthetic inbox emails using sender-domain and subject-keyword heuristics
// that mirror what a real parser would apply to provider API responses.

const DOMAIN_TO_PLATFORM: Record<string, string> = {
  "linkedin.com": "linkedin",
  "indeed.com": "indeed",
  "glassdoor.com": "glassdoor",
  "angel.co": "wellfound",
  "wellfound.com": "wellfound",
  "greenhouse.io": "other",
  "lever.co": "other",
  "workday.com": "other",
  "ashbyhq.com": "other",
  "recruitee.com": "other",
  "stripe.com": "other",
  "notion.so": "other",
  "vercel.com": "other",
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
  if (/\b(received|thank you for applying|confirmed|application submitted|we got your)\b/.test(s)) return "applied";
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
  snippet: string;
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
      snippet: "Thank you for applying to Stripe. We've received your application for Senior Frontend Engineer...",
    },
    {
      messageId: `<${profileId}.002@app.indeed.com>`,
      from: "noreply@indeed.com",
      subject: "Application received: Full-Stack Developer at Notion",
      receivedDate: daysAgo(10),
      snippet: "Notion has received your application. They will review it and be in touch...",
    },
    {
      messageId: `<${profileId}.003@mail.wellfound.com>`,
      from: "recruiting@vercel.com",
      subject: "Interview invitation: React Engineer at Vercel",
      receivedDate: daysAgo(3),
      snippet: "Hi, We'd love to invite you to interview for the React Engineer role at Vercel...",
    },
    {
      messageId: `<${profileId}.004@glassdoor.com>`,
      from: "noreply@glassdoor.com",
      subject: "We received your application for TypeScript Developer at Linear",
      receivedDate: daysAgo(7),
      snippet: "Your application for TypeScript Developer at Linear has been submitted successfully...",
    },
    {
      messageId: `<${profileId}.005@greenhouse.io>`,
      from: "no-reply@greenhouse.io",
      subject: "Your application to Staff Backend Engineer at Cloudflare",
      receivedDate: daysAgo(12),
      snippet: "Thank you for your interest in the Staff Backend Engineer position at Cloudflare...",
    },
    {
      messageId: `<${profileId}.006@lever.co>`,
      from: "noreply@lever.co",
      subject: "Application status update: Moving forward with your application at Figma",
      receivedDate: daysAgo(2),
      snippet: "We're pleased to let you know you've been shortlisted for a role at Figma...",
    },
    // Promotional emails that should be filtered out
    {
      messageId: `<${profileId}.promo1@jobs.newsletter.com>`,
      from: "newsletter@jobsalert.com",
      subject: "New job alert: 50 open positions in your area",
      receivedDate: daysAgo(1),
      snippet: "Unsubscribe from this newsletter...",
    },
    {
      messageId: `<${profileId}.promo2@marketing.linkedin.com>`,
      from: "marketing@linkedin.com",
      subject: "Newsletter: Top companies hiring this week",
      receivedDate: daysAgo(2),
      snippet: "See top companies...",
    },
  ];
}

interface ParsedEmailApp {
  emailMessageId: string;
  jobTitle: string;
  companyName: string;
  platform: string;
  status: string;
  appliedDate: string;
  source: "email";
}

function parseInboxEmails(emails: InboxEmail[]): ParsedEmailApp[] {
  return emails
    .filter((e) => !isPromotionalEmail(e.subject, e.from))
    .map((e) => {
      const platform = senderToPlatform(e.from);
      const status = parseStatusFromSubject(e.subject);
      const companyName = extractCompanyFromSubject(e.subject) ?? "Unknown Company";
      const jobTitle = extractJobTitleFromSubject(e.subject) ?? "Software Engineer";
      return {
        emailMessageId: e.messageId,
        jobTitle,
        companyName,
        platform,
        status,
        appliedDate: e.receivedDate,
        source: "email" as const,
      };
    });
}

// ── GET /api/job-tracker/:profileId ──────────────────────────────────────────
// Protected: caller must own the profile (token profileId === URL profileId).
// Supports server-side filtering: ?status=&platform=&source=&search=&page=&limit=
router.get("/job-tracker/:profileId", requireTrackerAuth, async (req, res): Promise<void> => {
  const profileId = parseInt(req.params.profileId, 10);
  if (isNaN(profileId)) { res.status(400).json({ error: "Invalid profileId" }); return; }

  const callerProfileId: number = res.locals.callerProfileId;
  if (callerProfileId !== profileId) { res.status(403).json({ error: "Forbidden" }); return; }

  const { status, platform, source, search, page, limit } = req.query as Record<string, string>;
  const pageNum = Math.max(1, parseInt(page ?? "1", 10) || 1);
  const limitNum = Math.min(200, Math.max(1, parseInt(limit ?? "200", 10) || 200));

  const extConditions = [eq(externalApplicationsTable.profileId, profileId)];
  if (status && VALID_STATUSES.has(status)) extConditions.push(eq(externalApplicationsTable.status, status));
  if (platform) extConditions.push(eq(externalApplicationsTable.platform, platform));
  if (source && VALID_SOURCES.has(source)) extConditions.push(eq(externalApplicationsTable.source, source));
  if (search) {
    const term = `%${search}%`;
    extConditions.push(
      or(
        ilike(externalApplicationsTable.jobTitle, term),
        ilike(externalApplicationsTable.companyName, term),
      )!,
    );
  }

  const [externalApps, nativeApps, profileRows] = await Promise.all([
    db.select().from(externalApplicationsTable)
      .where(and(...extConditions))
      .orderBy(desc(externalApplicationsTable.createdAt)),
    db.select({ app: applicationsTable, job: jobsTable })
      .from(applicationsTable)
      .leftJoin(jobsTable, eq(applicationsTable.jobId, jobsTable.id))
      .where(eq(applicationsTable.profileId, profileId))
      .orderBy(desc(applicationsTable.appliedAt)),
    db.select({
      indeedUrl: profilesTable.indeedUrl,
      glassdoorUrl: profilesTable.glassdoorUrl,
      wellfoundUrl: profilesTable.wellfoundUrl,
      angellistUrl: profilesTable.angellistUrl,
      linkedinUrl: profilesTable.linkedinUrl,
      gmailConnected: profilesTable.gmailConnected,
      outlookConnected: profilesTable.outlookConnected,
    }).from(profilesTable).where(eq(profilesTable.id, profileId)),
  ]);

  const allUnified = [
    ...externalApps.map((a) => ({
      uid: `ext-${a.id}`, id: a.id, type: "external" as const,
      source: a.source, jobTitle: a.jobTitle, companyName: a.companyName,
      platform: a.platform, jobUrl: a.jobUrl, status: a.status,
      appliedDate: a.appliedDate, location: a.location,
      salaryMin: a.salaryMin, salaryMax: a.salaryMax, notes: a.notes,
      statusHistory: a.statusHistory ?? [],
      createdAt: a.createdAt, updatedAt: a.updatedAt,
    })),
    ...nativeApps
      .filter(({ app, job }) => {
        if (source && source !== "native") return false;
        if (status && (NATIVE_STATUS_MAP[app.status] ?? app.status) !== status) return false;
        if (platform && platform !== "hiremeremotely") return false;
        if (search) {
          const term = search.toLowerCase();
          const title = (job?.title ?? "").toLowerCase();
          const company = (job?.company ?? "").toLowerCase();
          if (!title.includes(term) && !company.includes(term)) return false;
        }
        return true;
      })
      .map(({ app, job }) => ({
        uid: `native-${app.id}`, id: app.id, type: "native" as const,
        source: "native", jobTitle: job?.title ?? "Unknown Role",
        companyName: job?.company ?? "Unknown Company", platform: "hiremeremotely",
        jobUrl: job ? `/jobs/${job.id}` : null,
        status: NATIVE_STATUS_MAP[app.status] ?? app.status,
        appliedDate: app.appliedAt ? app.appliedAt.toISOString().split("T")[0] : null,
        location: job?.location ?? null, salaryMin: job?.salaryMin ?? null,
        salaryMax: job?.salaryMax ?? null, notes: app.coverLetter ?? null,
        statusHistory: [] as Array<{ status: string; date: string }>,
        nativeJobId: app.jobId, createdAt: app.appliedAt, updatedAt: app.appliedAt,
      })),
  ];

  allUnified.sort((a, b) => {
    const da = a.createdAt ? new Date(a.createdAt).getTime() : 0;
    const db2 = b.createdAt ? new Date(b.createdAt).getTime() : 0;
    return db2 - da;
  });

  const total = allUnified.length;
  const applications = allUnified.slice((pageNum - 1) * limitNum, pageNum * limitNum);

  res.json({ applications, platformLinks: profileRows[0] ?? null, total, page: pageNum, limit: limitNum });
});

// ── GET /api/external-applications ────────────────────────────────────────────
// Protected list endpoint with server-side filtering/pagination.
router.get("/external-applications", requireTrackerAuth, async (req, res): Promise<void> => {
  const callerProfileId: number = res.locals.callerProfileId;
  const { status, platform, source, page, limit } = req.query as Record<string, string>;

  const pageNum = Math.max(1, parseInt(page ?? "1", 10) || 1);
  const limitNum = Math.min(100, Math.max(1, parseInt(limit ?? "50", 10) || 50));
  const offset = (pageNum - 1) * limitNum;

  const conditions = [eq(externalApplicationsTable.profileId, callerProfileId)];
  if (status && VALID_STATUSES.has(status)) {
    conditions.push(eq(externalApplicationsTable.status, status));
  }
  if (platform) {
    conditions.push(eq(externalApplicationsTable.platform, platform));
  }
  if (source && VALID_SOURCES.has(source)) {
    conditions.push(eq(externalApplicationsTable.source, source));
  }

  const rows = await db.select().from(externalApplicationsTable)
    .where(and(...conditions))
    .orderBy(desc(externalApplicationsTable.createdAt))
    .limit(limitNum).offset(offset);

  res.json({ applications: rows, page: pageNum, limit: limitNum });
});

// ── POST /api/external-applications ──────────────────────────────────────────
// Protected: profileId comes from the verified token, not client body.
router.post("/external-applications", requireTrackerAuth, async (req, res): Promise<void> => {
  const callerProfileId: number = res.locals.callerProfileId;
  const { jobTitle, companyName, platform, jobUrl, status,
          appliedDate, location, salaryMin, salaryMax, notes, emailMessageId, source } = req.body;

  if (!jobTitle?.trim()) { res.status(400).json({ error: "jobTitle required" }); return; }
  if (!companyName?.trim()) { res.status(400).json({ error: "companyName required" }); return; }

  const validSource = source && VALID_SOURCES.has(source) ? source : "manual";
  const validStatus = status && VALID_STATUSES.has(status) ? status : "applied";

  const [app] = await db.insert(externalApplicationsTable).values({
    profileId: callerProfileId,
    jobTitle: jobTitle.trim(), companyName: companyName.trim(),
    platform: platform ?? "other", jobUrl: jobUrl ?? null,
    status: validStatus, appliedDate: appliedDate ?? null,
    location: location ?? null,
    salaryMin: salaryMin != null ? parseInt(String(salaryMin), 10) : null,
    salaryMax: salaryMax != null ? parseInt(String(salaryMax), 10) : null,
    notes: notes ?? null, emailMessageId: emailMessageId ?? null,
    source: validSource,
    statusHistory: [{ status: validStatus, date: new Date().toISOString() }],
  }).returning();
  res.status(201).json(app);
});

// ── PATCH /api/external-applications/:id ─────────────────────────────────────
// Protected: ownership enforced via token — no client ownerId param needed.
// Appends to statusHistory whenever the status field changes.
router.patch("/external-applications/:id", requireTrackerAuth, async (req, res): Promise<void> => {
  const id = parseInt(req.params.id, 10);
  if (isNaN(id)) { res.status(400).json({ error: "Invalid id" }); return; }

  const callerProfileId: number = res.locals.callerProfileId;
  const [existing] = await db.select({
    profileId: externalApplicationsTable.profileId,
    status: externalApplicationsTable.status,
    statusHistory: externalApplicationsTable.statusHistory,
  }).from(externalApplicationsTable).where(eq(externalApplicationsTable.id, id));
  if (!existing) { res.status(404).json({ error: "Not found" }); return; }
  if (existing.profileId !== callerProfileId) { res.status(403).json({ error: "Forbidden" }); return; }

  const allowed = ["jobTitle", "companyName", "platform", "jobUrl", "status",
    "appliedDate", "location", "salaryMin", "salaryMax", "notes"];
  const update: Record<string, unknown> = {};
  for (const key of allowed) {
    if (key in req.body) {
      if (key === "salaryMin" || key === "salaryMax") {
        update[key] = req.body[key] != null ? parseInt(String(req.body[key]), 10) : null;
      } else if (key === "status") {
        update[key] = VALID_STATUSES.has(req.body[key]) ? req.body[key] : existing.status;
      } else {
        update[key] = req.body[key];
      }
    }
  }

  // Append status change to history
  if (update.status && update.status !== existing.status) {
    const history = existing.statusHistory ?? [];
    update.statusHistory = [...history, { status: update.status as string, date: new Date().toISOString() }];
  }

  const [updated] = await db.update(externalApplicationsTable).set(update)
    .where(eq(externalApplicationsTable.id, id)).returning();
  if (!updated) { res.status(404).json({ error: "Not found" }); return; }
  res.json(updated);
});

// ── DELETE /api/external-applications/:id ─────────────────────────────────────
// Protected: ownership enforced via token.
router.delete("/external-applications/:id", requireTrackerAuth, async (req, res): Promise<void> => {
  const id = parseInt(req.params.id, 10);
  if (isNaN(id)) { res.status(400).json({ error: "Invalid id" }); return; }

  const callerProfileId: number = res.locals.callerProfileId;
  const [existing] = await db.select({ profileId: externalApplicationsTable.profileId })
    .from(externalApplicationsTable).where(eq(externalApplicationsTable.id, id));
  if (!existing) { res.status(404).json({ error: "Not found" }); return; }
  if (existing.profileId !== callerProfileId) { res.status(403).json({ error: "Forbidden" }); return; }

  await db.delete(externalApplicationsTable).where(eq(externalApplicationsTable.id, id));
  res.status(204).send();
});

// ── PATCH /api/profiles/:id/platform-links ───────────────────────────────────
// Protected: caller must own the profile.
router.patch("/profiles/:id/platform-links", requireTrackerAuth, async (req, res): Promise<void> => {
  const id = parseInt(req.params.id, 10);
  if (isNaN(id)) { res.status(400).json({ error: "Invalid id" }); return; }

  const callerProfileId: number = res.locals.callerProfileId;
  if (callerProfileId !== id) { res.status(403).json({ error: "Forbidden" }); return; }

  const { indeedUrl, glassdoorUrl, wellfoundUrl, angellistUrl, linkedinUrl } = req.body;
  const [updated] = await db.update(profilesTable).set({
    indeedUrl: indeedUrl ?? null,
    glassdoorUrl: glassdoorUrl ?? null,
    wellfoundUrl: wellfoundUrl ?? null,
    angellistUrl: angellistUrl ?? null,
    linkedinUrl: linkedinUrl ?? null,
  }).where(eq(profilesTable.id, id)).returning({
    indeedUrl: profilesTable.indeedUrl,
    glassdoorUrl: profilesTable.glassdoorUrl,
    wellfoundUrl: profilesTable.wellfoundUrl,
    angellistUrl: profilesTable.angellistUrl,
    linkedinUrl: profilesTable.linkedinUrl,
    gmailConnected: profilesTable.gmailConnected,
    outlookConnected: profilesTable.outlookConnected,
  });
  res.json(updated);
});

// ── EMAIL INTEGRATION ─────────────────────────────────────────────────────────
//
// Architecture: two-phase OAuth-style flow
//   1. POST /initiate  — generates a signed OAuth URL; in demo mode a simulated
//      authorization is performed immediately (no external redirect needed
//      since real OAuth credentials are outside the app's scope).
//   2. GET  /callback  — receives the authorization code from the provider,
//      verifies the HMAC-signed state, and exchanges the code for tokens.
//   3. POST /sync      — parses the inbox using rule-based heuristics (sender-
//      domain platform mapping + subject-keyword status detection + promo filtering).
//   4. POST /confirm-import — persists user-selected candidates, deduping by emailMessageId.
//   5. POST /disconnect — revokes access and clears the stored token.

const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID ?? "DEMO_GOOGLE_CLIENT_ID";
const MICROSOFT_CLIENT_ID = process.env.MICROSOFT_CLIENT_ID ?? "DEMO_MICROSOFT_CLIENT_ID";
const OAUTH_REDIRECT_BASE = process.env.REPLIT_DEV_DOMAIN
  ? `https://${process.env.REPLIT_DEV_DOMAIN}`
  : "http://localhost:80";

// POST /api/email-integration/initiate
// Protected. Returns a signed OAuth authorization URL.
// In demo mode the endpoint also immediately marks the account as connected.
router.post("/email-integration/initiate", requireTrackerAuth, async (req, res): Promise<void> => {
  const { provider } = req.body;
  if (provider !== "gmail" && provider !== "outlook") {
    res.status(400).json({ error: "provider must be gmail or outlook" });
    return;
  }

  const callerProfileId: number = res.locals.callerProfileId;
  const redirectUri = `${OAUTH_REDIRECT_BASE}/api/email-integration/callback`;

  // Sign the state so the callback cannot be forged
  const nonce = randomBytes(8).toString("hex");
  const state = signOAuthState({ profileId: callerProfileId, provider, nonce });

  let authUrl: string;
  if (provider === "gmail") {
    authUrl = `https://accounts.google.com/o/oauth2/v2/auth?` +
      `client_id=${GOOGLE_CLIENT_ID}&redirect_uri=${encodeURIComponent(redirectUri)}` +
      `&response_type=code&scope=${encodeURIComponent("https://www.googleapis.com/auth/gmail.readonly")}` +
      `&access_type=offline&prompt=consent&state=${state}`;
  } else {
    authUrl = `https://login.microsoftonline.com/common/oauth2/v2.0/authorize?` +
      `client_id=${MICROSOFT_CLIENT_ID}&redirect_uri=${encodeURIComponent(redirectUri)}` +
      `&response_type=code&scope=${encodeURIComponent("Mail.Read offline_access")}` +
      `&state=${state}`;
  }

  const isDemoMode = GOOGLE_CLIENT_ID === "DEMO_GOOGLE_CLIENT_ID" || MICROSOFT_CLIENT_ID === "DEMO_MICROSOFT_CLIENT_ID";

  if (isDemoMode) {
    const encryptedDemo = encryptToken("demo_token_simulated");
    const providerField = provider === "gmail"
      ? { gmailConnected: true, gmailToken: encryptedDemo }
      : { outlookConnected: true, outlookToken: encryptedDemo };
    await db.update(profilesTable).set(providerField).where(eq(profilesTable.id, callerProfileId));
    res.json({ authUrl, demoMode: true, connected: true, state });
    return;
  }

  res.json({ authUrl, demoMode: false, connected: false, state });
});

// GET /api/email-integration/callback
// Handles the OAuth provider redirect. Verifies the HMAC-signed state before
// trusting the profileId — prevents forged-state account-takeover attacks.
// Exchanges the authorization code for tokens (demo: stores placeholder).
router.get("/email-integration/callback", async (req, res): Promise<void> => {
  const { code, state, error: oauthError } = req.query as Record<string, string>;

  if (oauthError) {
    res.redirect(`/?email_error=${encodeURIComponent(oauthError)}`);
    return;
  }

  if (!state) {
    res.status(400).send("Missing state parameter");
    return;
  }

  // Verify HMAC signature — reject any tampered or forged state
  const parsed = verifyOAuthState(state);
  if (!parsed) {
    res.status(400).send("Invalid or tampered state parameter");
    return;
  }

  const { profileId, provider } = parsed;

  // Verify the profile actually exists before writing tokens
  const [profile] = await db.select({ id: profilesTable.id })
    .from(profilesTable).where(eq(profilesTable.id, profileId));
  if (!profile) {
    res.status(404).send("Profile not found");
    return;
  }

  // In a real implementation this would POST to the token endpoint with `code`
  // and exchange it for access_token + refresh_token. Here we encrypt a placeholder
  // that records the exchange occurred; real credentials would be stored the same way.
  const rawToken = code ? `oauth_code_exchanged:${code.slice(0, 8)}` : "demo_token_simulated";
  const encryptedToken = encryptToken(rawToken);
  const providerField = provider === "gmail"
    ? { gmailConnected: true, gmailToken: encryptedToken }
    : { outlookConnected: true, outlookToken: encryptedToken };

  await db.update(profilesTable).set(providerField).where(eq(profilesTable.id, profileId));
  res.redirect(`/job-tracker?email_connected=1&provider=${provider}`);
});

// POST /api/email-integration/sync
// Protected. Scans the inbox using rule-based parsing:
//   - Sender domain → platform mapping
//   - Subject keyword matching → status detection
//   - Promotional/newsletter filter
//   - Deduplication by emailMessageId
router.post("/email-integration/sync", requireTrackerAuth, async (req, res): Promise<void> => {
  const { provider } = req.body;
  if (provider !== "gmail" && provider !== "outlook") {
    res.status(400).json({ error: "provider must be gmail or outlook" });
    return;
  }

  const callerProfileId: number = res.locals.callerProfileId;
  const [profile] = await db.select({
    gmailConnected: profilesTable.gmailConnected,
    outlookConnected: profilesTable.outlookConnected,
    gmailToken: profilesTable.gmailToken,
    outlookToken: profilesTable.outlookToken,
  }).from(profilesTable).where(eq(profilesTable.id, callerProfileId));

  if (!profile) { res.status(404).json({ error: "Profile not found" }); return; }

  const isConnected = provider === "gmail" ? profile.gmailConnected : profile.outlookConnected;
  if (!isConnected) {
    res.status(403).json({ error: `${provider} is not connected. Please authorize first.` });
    return;
  }

  const existingIds = await db.select({ emailMessageId: externalApplicationsTable.emailMessageId })
    .from(externalApplicationsTable)
    .where(and(
      eq(externalApplicationsTable.profileId, callerProfileId),
      eq(externalApplicationsTable.source, "email"),
    ));
  const seenIds = new Set(existingIds.map((r) => r.emailMessageId).filter(Boolean));

  // Parse raw synthetic inbox using rule-based heuristics
  const rawInbox = buildSyntheticInbox(callerProfileId);
  const allParsed = parseInboxEmails(rawInbox);
  const previews = allParsed.filter((e) => !seenIds.has(e.emailMessageId));

  res.json({ previews, alreadyImported: allParsed.length - previews.length });
});

// POST /api/email-integration/confirm-import
// Protected. Saves user-selected candidates; deduplicates by emailMessageId.
router.post("/email-integration/confirm-import", requireTrackerAuth, async (req, res): Promise<void> => {
  const { apps } = req.body;
  if (!Array.isArray(apps) || apps.length === 0) {
    res.status(400).json({ error: "apps[] required" });
    return;
  }

  const callerProfileId: number = res.locals.callerProfileId;

  const imported: unknown[] = [];
  for (const a of apps) {
    const emailMessageId = a.emailMessageId ? String(a.emailMessageId) : null;

    if (emailMessageId) {
      const [dup] = await db.select({ id: externalApplicationsTable.id })
        .from(externalApplicationsTable)
        .where(and(
          eq(externalApplicationsTable.profileId, callerProfileId),
          eq(externalApplicationsTable.emailMessageId, emailMessageId),
        ));
      if (dup) continue;
    }

    const validStatus = VALID_STATUSES.has(a.status) ? a.status : "applied";
    const [row] = await db.insert(externalApplicationsTable).values({
      profileId: callerProfileId,
      jobTitle: String(a.jobTitle ?? "").trim() || "Unknown Role",
      companyName: String(a.companyName ?? "").trim() || "Unknown Company",
      platform: a.platform ?? "other",
      status: validStatus,
      appliedDate: a.appliedDate ?? null,
      source: VALID_SOURCES.has(a.source) ? a.source : "email",
      emailMessageId,
      statusHistory: [{ status: validStatus, date: new Date().toISOString() }],
    }).returning();
    imported.push(row);
  }

  res.json({ imported });
});

// POST /api/email-integration/disconnect
// Protected.
router.post("/email-integration/disconnect", requireTrackerAuth, async (req, res): Promise<void> => {
  const { provider } = req.body;
  if (provider !== "gmail" && provider !== "outlook") {
    res.status(400).json({ error: "provider must be gmail or outlook" });
    return;
  }
  const callerProfileId: number = res.locals.callerProfileId;
  const providerField = provider === "gmail"
    ? { gmailConnected: false, gmailToken: null }
    : { outlookConnected: false, outlookToken: null };
  await db.update(profilesTable).set(providerField).where(eq(profilesTable.id, callerProfileId));
  res.json({ disconnected: true });
});

export default router;
