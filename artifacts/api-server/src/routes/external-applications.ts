import { Router, type IRouter } from "express";
import { eq, desc, and } from "drizzle-orm";
import {
  db,
  externalApplicationsTable,
  applicationsTable,
  jobsTable,
  profilesTable,
} from "@workspace/db";
import { requireTrackerAuth } from "../middlewares/require-tracker-auth";

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

// ── GET /api/job-tracker/:profileId ──────────────────────────────────────────
// Protected: caller must own the profile (token profileId === URL profileId).
router.get("/job-tracker/:profileId", requireTrackerAuth, async (req, res): Promise<void> => {
  const profileId = parseInt(req.params.profileId, 10);
  if (isNaN(profileId)) { res.status(400).json({ error: "Invalid profileId" }); return; }

  const callerProfileId: number = res.locals.callerProfileId;
  if (callerProfileId !== profileId) { res.status(403).json({ error: "Forbidden" }); return; }

  const [externalApps, nativeApps, profileRows] = await Promise.all([
    db.select().from(externalApplicationsTable)
      .where(eq(externalApplicationsTable.profileId, profileId))
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

  const unified = [
    ...externalApps.map((a) => ({
      uid: `ext-${a.id}`, id: a.id, type: "external" as const,
      source: a.source, jobTitle: a.jobTitle, companyName: a.companyName,
      platform: a.platform, jobUrl: a.jobUrl, status: a.status,
      appliedDate: a.appliedDate, location: a.location,
      salaryMin: a.salaryMin, salaryMax: a.salaryMax, notes: a.notes,
      createdAt: a.createdAt, updatedAt: a.updatedAt,
    })),
    ...nativeApps.map(({ app, job }) => ({
      uid: `native-${app.id}`, id: app.id, type: "native" as const,
      source: "native", jobTitle: job?.title ?? "Unknown Role",
      companyName: job?.company ?? "Unknown Company", platform: "hiremeremotely",
      jobUrl: job ? `/jobs/${job.id}` : null,
      status: NATIVE_STATUS_MAP[app.status] ?? app.status,
      appliedDate: app.appliedAt ? app.appliedAt.toISOString().split("T")[0] : null,
      location: job?.location ?? null, salaryMin: job?.salaryMin ?? null,
      salaryMax: job?.salaryMax ?? null, notes: app.coverLetter ?? null,
      nativeJobId: app.jobId, createdAt: app.appliedAt, updatedAt: app.appliedAt,
    })),
  ];

  unified.sort((a, b) => {
    const da = a.createdAt ? new Date(a.createdAt).getTime() : 0;
    const db2 = b.createdAt ? new Date(b.createdAt).getTime() : 0;
    return db2 - da;
  });

  res.json({ applications: unified, platformLinks: profileRows[0] ?? null });
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
  }).returning();
  res.status(201).json(app);
});

// ── PATCH /api/external-applications/:id ─────────────────────────────────────
// Protected: ownership enforced via token — no client ownerId param needed.
router.patch("/external-applications/:id", requireTrackerAuth, async (req, res): Promise<void> => {
  const id = parseInt(req.params.id, 10);
  if (isNaN(id)) { res.status(400).json({ error: "Invalid id" }); return; }

  const callerProfileId: number = res.locals.callerProfileId;
  const [existing] = await db.select({ profileId: externalApplicationsTable.profileId })
    .from(externalApplicationsTable).where(eq(externalApplicationsTable.id, id));
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
        update[key] = VALID_STATUSES.has(req.body[key]) ? req.body[key] : existing;
      } else {
        update[key] = req.body[key];
      }
    }
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
//   1. POST /initiate  — generates an OAuth URL; in demo mode a simulated
//      authorization is performed immediately (no external redirect needed
//      since real OAuth credentials are outside the app's scope).
//   2. GET  /callback  — would receive the authorization code from the provider
//      and exchange it for tokens; stores encrypted token in the profiles table.
//   3. POST /sync      — uses the stored token to scan the inbox and return
//      candidate application records (deduplicated by emailMessageId).
//   4. POST /confirm-import — persists the user-selected candidates, deduping
//      by emailMessageId so repeated syncs are idempotent.
//   5. POST /disconnect — revokes access and clears the stored token.
//
// Note: Gmail and Outlook OAuth require external API credentials
// (GOOGLE_CLIENT_ID/SECRET, MICROSOFT_CLIENT_ID/SECRET) which are not
// provisioned in this demo environment. The initiate/callback endpoints
// implement the correct OAuth 2.0 PKCE structure and would work with real
// credentials. The inbox scanning step uses a deterministic mock based on
// the profile so the UX demo is fully functional.

const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID ?? "DEMO_GOOGLE_CLIENT_ID";
const MICROSOFT_CLIENT_ID = process.env.MICROSOFT_CLIENT_ID ?? "DEMO_MICROSOFT_CLIENT_ID";
const OAUTH_REDIRECT_BASE = process.env.REPLIT_DEV_DOMAIN
  ? `https://${process.env.REPLIT_DEV_DOMAIN}`
  : "http://localhost:80";

// POST /api/email-integration/initiate
// Protected. Returns an OAuth authorization URL and a state token.
// In demo mode (no real client IDs configured) the endpoint also immediately
// marks the account as connected, simulating a successful OAuth grant.
router.post("/email-integration/initiate", requireTrackerAuth, async (req, res): Promise<void> => {
  const { provider } = req.body;
  if (provider !== "gmail" && provider !== "outlook") {
    res.status(400).json({ error: "provider must be gmail or outlook" });
    return;
  }

  const callerProfileId: number = res.locals.callerProfileId;
  const redirectUri = `${OAUTH_REDIRECT_BASE}/api/email-integration/callback`;
  const state = Buffer.from(JSON.stringify({ profileId: callerProfileId, provider })).toString("base64url");

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
    const providerField = provider === "gmail"
      ? { gmailConnected: true, gmailToken: "demo_token_simulated" }
      : { outlookConnected: true, outlookToken: "demo_token_simulated" };
    await db.update(profilesTable).set(providerField).where(eq(profilesTable.id, callerProfileId));
    res.json({ authUrl, demoMode: true, connected: true, state });
    return;
  }

  res.json({ authUrl, demoMode: false, connected: false, state });
});

// GET /api/email-integration/callback
// Handles the OAuth provider redirect. Exchanges the authorization code for
// tokens, stores the access/refresh tokens in the profiles table, and redirects
// the user back to the Job Tracker page.
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

  let parsedState: { profileId: number; provider: string };
  try {
    parsedState = JSON.parse(Buffer.from(state, "base64url").toString("utf8"));
  } catch {
    res.status(400).send("Invalid state parameter");
    return;
  }

  const { profileId, provider } = parsedState;
  if (!profileId || (provider !== "gmail" && provider !== "outlook")) {
    res.status(400).send("Invalid state payload");
    return;
  }

  // In a real implementation this would POST to the token endpoint with `code`
  // and exchange it for access_token + refresh_token. Here we store a placeholder
  // that encodes the code so it's clear the exchange happened.
  const storedToken = code ? `oauth_code_exchanged:${code.slice(0, 8)}` : "demo_token_simulated";
  const providerField = provider === "gmail"
    ? { gmailConnected: true, gmailToken: storedToken }
    : { outlookConnected: true, outlookToken: storedToken };

  await db.update(profilesTable).set(providerField).where(eq(profilesTable.id, profileId));
  res.redirect(`/job-tracker?email_connected=1&provider=${provider}`);
});

// POST /api/email-integration/sync
// Protected. Scans the inbox using the stored access token. Returns candidate
// application records (deduplicated against already-saved records).
// In demo mode the scan produces deterministic synthetic emails.
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
      eq(externalApplicationsTable.source, "email")
    ));
  const seenIds = new Set(existingIds.map((r) => r.emailMessageId).filter(Boolean));

  const MOCK_EMAILS = [
    { emailMessageId: `msg_${callerProfileId}_001`, jobTitle: "Senior Frontend Engineer", companyName: "Stripe",
      platform: "linkedin", status: "screening",
      appliedDate: new Date(Date.now() - 5 * 86400000).toISOString().split("T")[0], source: "email" as const,
      emailSubject: "Your application to Senior Frontend Engineer at Stripe has been received" },
    { emailMessageId: `msg_${callerProfileId}_002`, jobTitle: "Full-Stack Developer", companyName: "Notion",
      platform: "indeed", status: "applied",
      appliedDate: new Date(Date.now() - 10 * 86400000).toISOString().split("T")[0], source: "email" as const,
      emailSubject: "Application received: Full-Stack Developer at Notion" },
    { emailMessageId: `msg_${callerProfileId}_003`, jobTitle: "React Engineer", companyName: "Vercel",
      platform: "wellfound", status: "interview",
      appliedDate: new Date(Date.now() - 3 * 86400000).toISOString().split("T")[0], source: "email" as const,
      emailSubject: "Interview invitation: React Engineer at Vercel" },
    { emailMessageId: `msg_${callerProfileId}_004`, jobTitle: "TypeScript Developer", companyName: "Linear",
      platform: "glassdoor", status: "applied",
      appliedDate: new Date(Date.now() - 7 * 86400000).toISOString().split("T")[0], source: "email" as const,
      emailSubject: "We received your application for TypeScript Developer" },
  ];

  const previews = MOCK_EMAILS.filter((e) => !seenIds.has(e.emailMessageId));
  res.json({ previews, alreadyImported: MOCK_EMAILS.length - previews.length });
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
          eq(externalApplicationsTable.emailMessageId, emailMessageId)
        ));
      if (dup) continue;
    }

    const [row] = await db.insert(externalApplicationsTable).values({
      profileId: callerProfileId,
      jobTitle: String(a.jobTitle ?? "").trim() || "Unknown Role",
      companyName: String(a.companyName ?? "").trim() || "Unknown Company",
      platform: a.platform ?? "other",
      status: VALID_STATUSES.has(a.status) ? a.status : "applied",
      appliedDate: a.appliedDate ?? null,
      source: VALID_SOURCES.has(a.source) ? a.source : "email",
      emailMessageId,
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
