import { Router, type IRouter } from "express";
import { db, interestRequestsTable, profilesTable, jobsTable, conversationsTable, messagesTable, notificationsTable } from "@workspace/db";
import { and, desc, eq, inArray, sql } from "drizzle-orm";

const router: IRouter = Router();

const MAX_PENDING_PER_COMPANY = 10;
const ADMIN_TOKEN = "bo_super_admin_token_2026";

function requireAdmin(req: any, res: any): boolean {
  if (req.header("x-admin-token") !== ADMIN_TOKEN) {
    res.status(401).json({ error: "Unauthorized" });
    return false;
  }
  return true;
}

function orderedPair(a: number, b: number): [number, number] {
  return a < b ? [a, b] : [b, a];
}

// ── POST /api/interest-requests ──────────────────────────────────────────────
// Body: { companyProfileId, candidateProfileId, jobId?, companyNote? }
router.post("/interest-requests", async (req, res): Promise<void> => {
  const { companyProfileId, candidateProfileId, jobId, companyNote } = req.body ?? {};
  const companyId = Number(companyProfileId);
  const candidateId = Number(candidateProfileId);
  if (!companyId || !candidateId) {
    res.status(400).json({ error: "companyProfileId and candidateProfileId required" });
    return;
  }

  // Validate company is actually a company account, candidate is individual
  const [company] = await db.select().from(profilesTable).where(eq(profilesTable.id, companyId)).limit(1);
  const [candidate] = await db.select().from(profilesTable).where(eq(profilesTable.id, candidateId)).limit(1);
  if (!company || company.accountType !== "company") {
    res.status(403).json({ error: "Only company accounts can express interest." });
    return;
  }
  if (!candidate || candidate.accountType !== "individual") {
    res.status(400).json({ error: "Interest can only be expressed in individual candidates." });
    return;
  }

  // Rate limit: cap pending interests per company
  const [{ pendingCount }] = await db
    .select({ pendingCount: sql<number>`count(*)` })
    .from(interestRequestsTable)
    .where(and(eq(interestRequestsTable.companyProfileId, companyId), eq(interestRequestsTable.status, "pending")));
  if (Number(pendingCount) >= MAX_PENDING_PER_COMPANY) {
    res.status(429).json({ error: `You have ${MAX_PENDING_PER_COMPANY} pending interest requests. Please wait for HMR to review them before sending more.` });
    return;
  }

  // Check duplicate pending request for same candidate
  const [duplicate] = await db
    .select({ id: interestRequestsTable.id })
    .from(interestRequestsTable)
    .where(and(
      eq(interestRequestsTable.companyProfileId, companyId),
      eq(interestRequestsTable.candidateProfileId, candidateId),
      eq(interestRequestsTable.status, "pending"),
    ))
    .limit(1);
  if (duplicate) {
    res.status(409).json({ error: "You already have a pending interest request for this candidate." });
    return;
  }

  const [created] = await db
    .insert(interestRequestsTable)
    .values({
      companyProfileId: companyId,
      candidateProfileId: candidateId,
      jobId: jobId ? Number(jobId) : null,
      companyNote: companyNote ? String(companyNote).trim().slice(0, 500) : null,
    })
    .returning();

  res.status(201).json(created);
});

// ── GET /api/interest-requests/status?companyProfileId=&candidateProfileId= ───
// Returns the current status for a specific company → candidate pair, or null.
router.get("/interest-requests/status", async (req, res): Promise<void> => {
  const companyId   = Number(req.query.companyProfileId);
  const candidateId = Number(req.query.candidateProfileId);
  if (!companyId || !candidateId) {
    res.status(400).json({ error: "companyProfileId and candidateProfileId required" });
    return;
  }

  const [row] = await db
    .select({ id: interestRequestsTable.id, status: interestRequestsTable.status })
    .from(interestRequestsTable)
    .where(and(
      eq(interestRequestsTable.companyProfileId, companyId),
      eq(interestRequestsTable.candidateProfileId, candidateId),
    ))
    .orderBy(desc(interestRequestsTable.createdAt))
    .limit(1);

  res.json({ status: row?.status ?? null });
});

// ── GET /api/interest-requests/by-company?companyProfileId= ───────────────────
router.get("/interest-requests/by-company", async (req, res): Promise<void> => {
  const companyId = Number(req.query.companyProfileId);
  if (!companyId) { res.status(400).json({ error: "companyProfileId required" }); return; }

  const rows = await db
    .select({
      id: interestRequestsTable.id,
      status: interestRequestsTable.status,
      companyNote: interestRequestsTable.companyNote,
      adminNote: interestRequestsTable.adminNote,
      jobId: interestRequestsTable.jobId,
      createdAt: interestRequestsTable.createdAt,
      respondedAt: interestRequestsTable.respondedAt,
      candidateId: profilesTable.id,
      candidateName: profilesTable.name,
      candidateHeadline: profilesTable.headline,
      candidateAvatarUrl: profilesTable.avatarUrl,
    })
    .from(interestRequestsTable)
    .innerJoin(profilesTable, eq(profilesTable.id, interestRequestsTable.candidateProfileId))
    .where(eq(interestRequestsTable.companyProfileId, companyId))
    .orderBy(desc(interestRequestsTable.createdAt));

  // Enrich with job titles
  const jobIds = Array.from(new Set(rows.map(r => r.jobId).filter((j): j is number => j != null)));
  const jobs = jobIds.length
    ? await db.select({ id: jobsTable.id, title: jobsTable.title }).from(jobsTable).where(inArray(jobsTable.id, jobIds))
    : [];
  const jobMap = new Map(jobs.map(j => [j.id, j.title]));

  res.json(rows.map(r => ({ ...r, jobTitle: r.jobId ? jobMap.get(r.jobId) ?? null : null })));
});

// ── GET /api/admin/interest-requests ─────────────────────────────────────────
// Admin-only listing of all interest requests with company + candidate enrichment.
router.get("/admin/interest-requests", async (req, res): Promise<void> => {
  if (!requireAdmin(req, res)) return;
  const status = typeof req.query.status === "string" ? req.query.status : null;

  const whereClause = status && status !== "all"
    ? eq(interestRequestsTable.status, status)
    : undefined;

  const rows = await db
    .select()
    .from(interestRequestsTable)
    .where(whereClause)
    .orderBy(desc(interestRequestsTable.createdAt))
    .limit(200);

  // Bulk fetch companies, candidates, jobs
  const companyIds = Array.from(new Set(rows.map(r => r.companyProfileId)));
  const candidateIds = Array.from(new Set(rows.map(r => r.candidateProfileId)));
  const jobIds = Array.from(new Set(rows.map(r => r.jobId).filter((j): j is number => j != null)));

  const [companies, candidates, jobs] = await Promise.all([
    companyIds.length ? db.select({ id: profilesTable.id, name: profilesTable.name, avatarUrl: profilesTable.avatarUrl, headline: profilesTable.headline }).from(profilesTable).where(inArray(profilesTable.id, companyIds)) : Promise.resolve([] as Array<{id:number;name:string;avatarUrl:string|null;headline:string}>),
    candidateIds.length ? db.select({ id: profilesTable.id, name: profilesTable.name, avatarUrl: profilesTable.avatarUrl, headline: profilesTable.headline, email: profilesTable.email }).from(profilesTable).where(inArray(profilesTable.id, candidateIds)) : Promise.resolve([] as Array<{id:number;name:string;avatarUrl:string|null;headline:string;email:string|null}>),
    jobIds.length ? db.select({ id: jobsTable.id, title: jobsTable.title }).from(jobsTable).where(inArray(jobsTable.id, jobIds)) : Promise.resolve([] as Array<{id:number;title:string}>),
  ]);

  const companyMap = new Map(companies.map(c => [c.id, c]));
  const candidateMap = new Map(candidates.map(c => [c.id, c]));
  const jobMap = new Map(jobs.map(j => [j.id, j.title]));

  const enriched = rows.map(r => ({
    ...r,
    company: companyMap.get(r.companyProfileId) ?? null,
    candidate: candidateMap.get(r.candidateProfileId) ?? null,
    jobTitle: r.jobId ? jobMap.get(r.jobId) ?? null : null,
  }));

  // Counts by status
  const counts = await db
    .select({ status: interestRequestsTable.status, count: sql<number>`count(*)` })
    .from(interestRequestsTable)
    .groupBy(interestRequestsTable.status);

  res.json({
    requests: enriched,
    counts: counts.reduce((acc, c) => ({ ...acc, [c.status]: Number(c.count) }), {} as Record<string, number>),
  });
});

// ── POST /api/admin/interest-requests/:id/approve ────────────────────────────
// Body: { introMessage, adminNote? }
// Creates a conversation between candidate and company, posts the intro message
// from the company, and marks the request approved.
router.post("/admin/interest-requests/:id/approve", async (req, res): Promise<void> => {
  if (!requireAdmin(req, res)) return;
  const id = Number(req.params.id);
  if (!id) { res.status(400).json({ error: "Invalid id" }); return; }

  const { introMessage, adminNote } = req.body ?? {};
  const msg = typeof introMessage === "string" ? introMessage.trim() : "";
  if (!msg) { res.status(400).json({ error: "introMessage required" }); return; }

  const [ireq] = await db.select().from(interestRequestsTable).where(eq(interestRequestsTable.id, id)).limit(1);
  if (!ireq) { res.status(404).json({ error: "Interest request not found" }); return; }
  if (ireq.status !== "pending") { res.status(400).json({ error: `Request is already ${ireq.status}` }); return; }

  // Get or create a direct conversation between company and candidate.
  // (Bypasses the company→individual policy guard — this is an HMR-approved intro.)
  const [p1, p2] = orderedPair(ireq.companyProfileId, ireq.candidateProfileId);
  let [conv] = await db
    .select()
    .from(conversationsTable)
    .where(and(
      eq(conversationsTable.participant1Id, p1),
      eq(conversationsTable.participant2Id, p2),
      eq(conversationsTable.type, "direct"),
    ))
    .limit(1);

  if (!conv) {
    const [created] = await db
      .insert(conversationsTable)
      .values({ participant1Id: p1, participant2Id: p2, type: "direct" })
      .returning();
    conv = created;
  }

  // Post the intro message from the company
  await db.insert(messagesTable).values({
    conversationId: conv.id,
    senderProfileId: ireq.companyProfileId,
    content: msg.slice(0, 4000),
  });

  // Update conversation preview
  await db
    .update(conversationsTable)
    .set({ lastMessageAt: new Date(), lastMessagePreview: msg.slice(0, 80) })
    .where(eq(conversationsTable.id, conv.id));

  // Notify the candidate
  const [company] = await db.select({ name: profilesTable.name }).from(profilesTable).where(eq(profilesTable.id, ireq.companyProfileId)).limit(1);
  await db.insert(notificationsTable).values({
    recipientProfileId: ireq.candidateProfileId,
    actorProfileId: ireq.companyProfileId,
    type: "new_message",
    conversationId: conv.id,
    message: `${company?.name ?? "A company"} sent you a message`,
  });

  // Mark request approved — conditional on still being pending, so concurrent
  // approvals are idempotent (only the first one wins).
  const [updated] = await db
    .update(interestRequestsTable)
    .set({
      status: "approved",
      adminNote: adminNote ? String(adminNote).slice(0, 1000) : null,
      respondedAt: new Date(),
    })
    .where(and(eq(interestRequestsTable.id, id), eq(interestRequestsTable.status, "pending")))
    .returning();

  res.json({ ...(updated ?? ireq), conversationId: conv.id });
});

// ── POST /api/admin/interest-requests/:id/decline ────────────────────────────
// Body: { adminNote? }
router.post("/admin/interest-requests/:id/decline", async (req, res): Promise<void> => {
  if (!requireAdmin(req, res)) return;
  const id = Number(req.params.id);
  if (!id) { res.status(400).json({ error: "Invalid id" }); return; }

  const { adminNote } = req.body ?? {};

  // Conditional update — only declines if still pending. Concurrent decline
  // (or a concurrent approve) is harmless: the second writer is a no-op.
  const [updated] = await db
    .update(interestRequestsTable)
    .set({
      status: "declined",
      adminNote: adminNote ? String(adminNote).slice(0, 1000) : null,
      respondedAt: new Date(),
    })
    .where(and(eq(interestRequestsTable.id, id), eq(interestRequestsTable.status, "pending")))
    .returning();

  if (!updated) {
    const [existing] = await db.select().from(interestRequestsTable).where(eq(interestRequestsTable.id, id)).limit(1);
    if (!existing) { res.status(404).json({ error: "Interest request not found" }); return; }
    res.status(409).json({ error: `Request is already ${existing.status}` });
    return;
  }

  res.json(updated);
});

export default router;
