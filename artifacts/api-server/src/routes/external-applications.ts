import { Router, type IRouter } from "express";
import { eq, desc } from "drizzle-orm";
import {
  db,
  externalApplicationsTable,
  applicationsTable,
  jobsTable,
  profilesTable,
} from "@workspace/db";

const router: IRouter = Router();

const NATIVE_STATUS_MAP: Record<string, string> = {
  pending: "applied",
  reviewing: "screening",
  interview: "interview",
  offer: "offer",
  accepted: "accepted",
  rejected: "rejected",
};

// ── GET /api/job-tracker/:profileId ──────────────────────────────────────────
router.get("/job-tracker/:profileId", async (req, res): Promise<void> => {
  const profileId = parseInt(req.params.profileId, 10);
  if (isNaN(profileId)) { res.status(400).json({ error: "Invalid profileId" }); return; }

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

// ── POST /api/external-applications ──────────────────────────────────────────
router.post("/external-applications", async (req, res): Promise<void> => {
  const { profileId, jobTitle, companyName, platform, jobUrl, status,
          appliedDate, location, salaryMin, salaryMax, notes, emailMessageId, source } = req.body;

  const profileIdNum = profileId != null ? parseInt(String(profileId), 10) : NaN;
  if (isNaN(profileIdNum) || profileIdNum <= 0) { res.status(400).json({ error: "profileId required" }); return; }
  if (!jobTitle?.trim()) { res.status(400).json({ error: "jobTitle required" }); return; }
  if (!companyName?.trim()) { res.status(400).json({ error: "companyName required" }); return; }

  const [app] = await db.insert(externalApplicationsTable).values({
    profileId: profileIdNum, jobTitle: jobTitle.trim(), companyName: companyName.trim(),
    platform: platform ?? "other", jobUrl: jobUrl ?? null,
    status: status ?? "applied", appliedDate: appliedDate ?? null,
    location: location ?? null,
    salaryMin: salaryMin != null ? parseInt(String(salaryMin), 10) : null,
    salaryMax: salaryMax != null ? parseInt(String(salaryMax), 10) : null,
    notes: notes ?? null, emailMessageId: emailMessageId ?? null,
    source: source ?? "manual",
  }).returning();
  res.status(201).json(app);
});

// ── PATCH /api/external-applications/:id ─────────────────────────────────────
// Requires ownerId in body — enforces ownership against DB record.
router.patch("/external-applications/:id", async (req, res): Promise<void> => {
  const id = parseInt(req.params.id, 10);
  if (isNaN(id)) { res.status(400).json({ error: "Invalid id" }); return; }

  const ownerId = req.body.ownerId != null ? parseInt(String(req.body.ownerId), 10) : NaN;
  if (isNaN(ownerId)) { res.status(400).json({ error: "ownerId required" }); return; }

  const [existing] = await db.select({ profileId: externalApplicationsTable.profileId })
    .from(externalApplicationsTable).where(eq(externalApplicationsTable.id, id));
  if (!existing) { res.status(404).json({ error: "Not found" }); return; }
  if (existing.profileId !== ownerId) { res.status(403).json({ error: "Forbidden" }); return; }

  const allowed = ["jobTitle", "companyName", "platform", "jobUrl", "status",
    "appliedDate", "location", "salaryMin", "salaryMax", "notes"];
  const update: Record<string, unknown> = {};
  for (const key of allowed) {
    if (key in req.body) {
      if (key === "salaryMin" || key === "salaryMax") {
        update[key] = req.body[key] != null ? parseInt(String(req.body[key]), 10) : null;
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
// Requires ownerId query param — enforces ownership against DB record.
router.delete("/external-applications/:id", async (req, res): Promise<void> => {
  const id = parseInt(req.params.id, 10);
  if (isNaN(id)) { res.status(400).json({ error: "Invalid id" }); return; }

  const ownerId = req.query.ownerId != null ? parseInt(String(req.query.ownerId), 10) : NaN;
  if (isNaN(ownerId)) { res.status(400).json({ error: "ownerId required" }); return; }

  const [existing] = await db.select({ profileId: externalApplicationsTable.profileId })
    .from(externalApplicationsTable).where(eq(externalApplicationsTable.id, id));
  if (!existing) { res.status(404).json({ error: "Not found" }); return; }
  if (existing.profileId !== ownerId) { res.status(403).json({ error: "Forbidden" }); return; }

  await db.delete(externalApplicationsTable).where(eq(externalApplicationsTable.id, id));
  res.status(204).send();
});

// ── PATCH /api/profiles/:id/platform-links ───────────────────────────────────
router.patch("/profiles/:id/platform-links", async (req, res): Promise<void> => {
  const id = parseInt(req.params.id, 10);
  if (isNaN(id)) { res.status(400).json({ error: "Invalid id" }); return; }

  const { indeedUrl, glassdoorUrl, wellfoundUrl, angellistUrl, linkedinUrl, ownerId } = req.body;

  const ownerIdNum = ownerId != null ? parseInt(String(ownerId), 10) : NaN;
  if (isNaN(ownerIdNum)) { res.status(400).json({ error: "ownerId required" }); return; }
  if (ownerIdNum !== id) { res.status(403).json({ error: "Forbidden" }); return; }

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

// ── POST /api/email-integration/preview-inbox ────────────────────────────────
// Step 1: scan inbox preview — marks account as connected, returns preview
// apps WITHOUT saving them. Frontend reviews and selects which to import.
router.post("/email-integration/preview-inbox", async (req, res): Promise<void> => {
  const { profileId, provider } = req.body;
  if (!profileId || (provider !== "gmail" && provider !== "outlook")) {
    res.status(400).json({ error: "profileId and provider (gmail|outlook) required" });
    return;
  }

  const providerField = provider === "gmail" ? { gmailConnected: true } : { outlookConnected: true };
  await db.update(profilesTable).set(providerField).where(eq(profilesTable.id, Number(profileId)));

  const MOCK_PREVIEWS = [
    { jobTitle: "Senior Frontend Engineer", companyName: "Stripe",
      platform: "linkedin", status: "screening",
      appliedDate: new Date(Date.now() - 5 * 86400000).toISOString().split("T")[0], source: "email",
      emailSubject: "Your application to Senior Frontend Engineer at Stripe has been received" },
    { jobTitle: "Full-Stack Developer", companyName: "Notion",
      platform: "indeed", status: "applied",
      appliedDate: new Date(Date.now() - 10 * 86400000).toISOString().split("T")[0], source: "email",
      emailSubject: "Application received: Full-Stack Developer at Notion" },
    { jobTitle: "React Engineer", companyName: "Vercel",
      platform: "wellfound", status: "interview",
      appliedDate: new Date(Date.now() - 3 * 86400000).toISOString().split("T")[0], source: "email",
      emailSubject: "Interview invitation: React Engineer at Vercel" },
    { jobTitle: "TypeScript Developer", companyName: "Linear",
      platform: "glassdoor", status: "applied",
      appliedDate: new Date(Date.now() - 7 * 86400000).toISOString().split("T")[0], source: "email",
      emailSubject: "We received your application for TypeScript Developer" },
  ];

  res.json({ connected: true, previews: MOCK_PREVIEWS });
});

// ── POST /api/email-integration/confirm-import ───────────────────────────────
// Step 2: user selects which preview apps to import; this saves them.
router.post("/email-integration/confirm-import", async (req, res): Promise<void> => {
  const { profileId, apps } = req.body;
  if (!profileId || !Array.isArray(apps) || apps.length === 0) {
    res.status(400).json({ error: "profileId and apps[] required" });
    return;
  }

  const toInsert = apps.map((a: {
    jobTitle: string; companyName: string; platform?: string;
    status?: string; appliedDate?: string; source?: string;
  }) => ({
    profileId: Number(profileId),
    jobTitle: String(a.jobTitle ?? "").trim() || "Unknown Role",
    companyName: String(a.companyName ?? "").trim() || "Unknown Company",
    platform: a.platform ?? "other",
    status: a.status ?? "applied",
    appliedDate: a.appliedDate ?? null,
    source: a.source ?? "email",
  }));

  const inserted = await db.insert(externalApplicationsTable).values(toInsert).returning();
  res.json({ imported: inserted });
});

// ── POST /api/email-integration/disconnect ────────────────────────────────────
router.post("/email-integration/disconnect", async (req, res): Promise<void> => {
  const { profileId, provider } = req.body;
  if (!profileId || (provider !== "gmail" && provider !== "outlook")) {
    res.status(400).json({ error: "profileId and provider (gmail|outlook) required" });
    return;
  }
  const providerField = provider === "gmail" ? { gmailConnected: false } : { outlookConnected: false };
  await db.update(profilesTable).set(providerField).where(eq(profilesTable.id, Number(profileId)));
  res.json({ disconnected: true });
});

export default router;
