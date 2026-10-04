import { Router, type IRouter } from "express";
import { db, interestRequestsTable, profilesTable, jobsTable, conversationsTable, messagesTable, notificationsTable, hmrAuditEventsTable } from "@workspace/db";
import { and, desc, eq, inArray, lte, or, sql } from "drizzle-orm";

const router: IRouter = Router();

const MAX_PENDING_PER_COMPANY = 10;

function requireAdmin(req: any, res: any): boolean {
  if (req.session?.isAdmin !== true) {
    res.status(401).json({ error: "Unauthorized" });
    return false;
  }
  return true;
}
function adminMetadata(req: any): Record<string, unknown> {
  return { adminEmail: req.session?.adminEmail ?? null, adminSession: true };
}
function activeStatus(status: string, expiresAt: Date | null, releaseExpiresAt: Date | null, revokedAt: Date | null): string {
  const now = Date.now();
  if (revokedAt || status === "revoked") return "revoked";
  if (releaseExpiresAt && releaseExpiresAt.getTime() <= now) return "expired";
  if (expiresAt && expiresAt.getTime() <= now && ["pending_hmr", "pending_candidate"].includes(status)) return "expired";
  return status;
}

function orderedPair(a: number, b: number): [number, number] {
  return a < b ? [a, b] : [b, a];
}

async function expireStaleRequests(): Promise<void> {
  const now = new Date();
  const stale = await db.select({
    id: interestRequestsTable.id,
    status: interestRequestsTable.status,
  }).from(interestRequestsTable).where(or(
    and(
      inArray(interestRequestsTable.status, ["pending", "pending_hmr", "pending_candidate"]),
      lte(interestRequestsTable.expiresAt, now),
    ),
    and(
      eq(interestRequestsTable.status, "approved"),
      lte(interestRequestsTable.releaseExpiresAt, now),
    ),
  ));
  for (const row of stale) {
    const [expired] = await db.update(interestRequestsTable).set({
      status: "expired",
      respondedAt: now,
    }).where(and(
      eq(interestRequestsTable.id, row.id),
      eq(interestRequestsTable.status, row.status),
    )).returning({ id: interestRequestsTable.id });
    if (expired) {
      await db.insert(hmrAuditEventsTable).values({
        interestRequestId: row.id,
        actorRole: "system",
        event: "automatic_expiry",
        metadata: { previousStatus: row.status },
      });
    }
  }
}

// This router is mounted at /api alongside auth and other feature routers.
// Expiry maintenance must not run for requests owned by those other routers.
router.use(["/interest-requests", "/admin/interest-requests"], async (_req, _res, next) => {
  try {
    await expireStaleRequests();
    next();
  } catch (error) {
    next(error);
  }
});

// ── POST /api/interest-requests ──────────────────────────────────────────────
// Body: { companyProfileId, candidateProfileId, jobId?, companyNote? }
router.post("/interest-requests", async (req, res): Promise<void> => {
  const { candidateProfileId, jobId, roleTitle, companyNote } = req.body ?? {};
  const companyId = Number(req.session?.profileId);
  const candidateId = Number(candidateProfileId);
  if (!companyId || !candidateId || !roleTitle) {
    res.status(400).json({ error: "candidateProfileId and roleTitle required" });
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
  if (jobId) {
    const [job] = await db.select({ companyProfileId: jobsTable.companyProfileId }).from(jobsTable).where(eq(jobsTable.id, Number(jobId)));
    if (!job || job.companyProfileId !== companyId) { res.status(403).json({ error: "You may only reference your own jobs" }); return; }
  }

  // Rate limit: cap pending interests per company
  const [{ pendingCount }] = await db
    .select({ pendingCount: sql<number>`count(*)` })
    .from(interestRequestsTable)
    .where(and(eq(interestRequestsTable.companyProfileId, companyId), inArray(interestRequestsTable.status, ["pending", "pending_hmr", "pending_candidate"])));
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
       inArray(interestRequestsTable.status, ["pending", "pending_hmr", "pending_candidate"]),
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
      roleTitle: String(roleTitle).trim().slice(0, 200),
      companyNote: companyNote ? String(companyNote).trim().slice(0, 500) : null,
    status: "pending_hmr",
    expiresAt: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000),
    })
    .returning();

  await db.insert(hmrAuditEventsTable).values({ interestRequestId: created.id, actorProfileId: companyId, actorRole: "company", event: "submission", metadata: {} });
  res.status(201).json(created);
});

// ── GET /api/interest-requests/status?companyProfileId=&candidateProfileId= ───
// Returns the current status for a specific company → candidate pair, or null.
router.get("/interest-requests/status", async (req, res): Promise<void> => {
  const companyId   = Number(req.session?.profileId);
  const candidateId = Number(req.query.candidateProfileId);
  if (!companyId || !candidateId) {
    res.status(400).json({ error: "companyProfileId and candidateProfileId required" });
    return;
  }

  const [row] = await db
    .select({
      id: interestRequestsTable.id,
      status: interestRequestsTable.status,
      expiresAt: interestRequestsTable.expiresAt,
      releaseExpiresAt: interestRequestsTable.releaseExpiresAt,
      revokedAt: interestRequestsTable.revokedAt,
    })
    .from(interestRequestsTable)
    .where(and(
      eq(interestRequestsTable.companyProfileId, companyId),
      eq(interestRequestsTable.candidateProfileId, candidateId),
    ))
    .orderBy(desc(interestRequestsTable.createdAt))
    .limit(1);

  res.json({ status: row ? activeStatus(row.status, row.expiresAt, row.releaseExpiresAt, row.revokedAt) : null });
});

// ── GET /api/interest-requests/by-company?companyProfileId= ───────────────────
router.get("/interest-requests/by-company", async (req, res): Promise<void> => {
  const companyId = Number(req.session?.profileId);
  if (!companyId) { res.status(401).json({ error: "Authentication required" }); return; }
  const [viewer] = await db.select({ accountType: profilesTable.accountType }).from(profilesTable).where(eq(profilesTable.id, companyId));
  if (viewer?.accountType !== "company") { res.status(403).json({ error: "Company account required" }); return; }

  const rows = await db
    .select({
      id: interestRequestsTable.id,
      status: interestRequestsTable.status,
      companyNote: interestRequestsTable.companyNote,
      adminNote: interestRequestsTable.adminNote,
      jobId: interestRequestsTable.jobId,
      createdAt: interestRequestsTable.createdAt,
      respondedAt: interestRequestsTable.respondedAt,
       expiresAt: interestRequestsTable.expiresAt,
       releaseExpiresAt: interestRequestsTable.releaseExpiresAt,
       revokedAt: interestRequestsTable.revokedAt,
      conversationId: interestRequestsTable.conversationId,
      releaseScope: interestRequestsTable.releaseScope,
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

  res.json(rows.map(r => {
    const status = activeStatus(r.status, r.expiresAt, r.releaseExpiresAt, r.revokedAt);
    const approved = status === "approved";
    return {
       id: r.id, status, companyNote: r.companyNote, adminNote: r.adminNote,
      jobId: r.jobId, createdAt: r.createdAt, respondedAt: r.respondedAt,
      jobTitle: r.jobId ? jobMap.get(r.jobId) ?? null : null,
      conversationId: r.conversationId,
      candidate: approved ? {
        ...(r.releaseScope.includes("identity") ? { id: r.candidateId, name: r.candidateName, avatarUrl: r.candidateAvatarUrl } : { label: "Professional candidate" }),
        ...(r.releaseScope.includes("identity") ? { headline: r.candidateHeadline } : {}),
      } : { label: "Professional candidate" },
    };
  }));
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
    status: activeStatus(r.status, r.expiresAt, r.releaseExpiresAt, r.revokedAt),
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
// Legacy alias retained for old clients. It now performs the same HMR routing
// step as /route and never creates a conversation or releases identity.
router.post("/admin/interest-requests/:id/approve", async (req, res): Promise<void> => {
  if (!requireAdmin(req, res)) return;
  const id = Number(req.params.id);
  if (!id) { res.status(400).json({ error: "Invalid id" }); return; }

  const { adminNote } = req.body ?? {};

  const [ireq] = await db.select().from(interestRequestsTable).where(eq(interestRequestsTable.id, id)).limit(1);
  if (!ireq) { res.status(404).json({ error: "Interest request not found" }); return; }
   if (!["pending", "pending_hmr"].includes(ireq.status)) { res.status(400).json({ error: `Request is already ${ireq.status}` }); return; }
  // Legacy approve calls are now treated as an HMR route. Identity release and
  // conversation creation must only happen after the candidate's explicit approval.
  const [routed] = await db.update(interestRequestsTable).set({
    status: "pending_candidate",
    adminNote: adminNote ? String(adminNote).slice(0, 1000) : null,
   }).where(and(eq(interestRequestsTable.id, id), inArray(interestRequestsTable.status, ["pending", "pending_hmr"]))).returning();
   if (!routed) { res.status(409).json({ error: "Request was already decided" }); return; }
   await db.insert(hmrAuditEventsTable).values({ interestRequestId: id, actorRole: "hmr", event: "route_to_candidate", metadata: adminMetadata(req) });
  await db.insert(notificationsTable).values({ recipientProfileId: ireq.candidateProfileId, actorProfileId: ireq.companyProfileId, type: "system", message: "You have a new professional introduction request to review" });
  res.json(routed);
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
      status: "declined_hmr",
      adminNote: adminNote ? String(adminNote).slice(0, 1000) : null,
      respondedAt: new Date(),
    })
    .where(and(eq(interestRequestsTable.id, id), inArray(interestRequestsTable.status, ["pending", "pending_hmr"])))
    .returning();

  if (!updated) {
    const [existing] = await db.select().from(interestRequestsTable).where(eq(interestRequestsTable.id, id)).limit(1);
    if (!existing) { res.status(404).json({ error: "Interest request not found" }); return; }
    res.status(409).json({ error: `Request is already ${existing.status}` });
    return;
  }

   await db.insert(hmrAuditEventsTable).values({ interestRequestId: updated.id, actorRole: "hmr", event: "hmr_decline", metadata: adminMetadata(req) });
  await db.insert(notificationsTable).values({
    recipientProfileId: updated.companyProfileId, actorProfileId: updated.companyProfileId,
    type: "system", message: "Your professional introduction request was declined by HMR",
  });
  res.json(updated);
});

// HMR routes a request without opening a conversation or exposing candidate identity.
router.post("/admin/interest-requests/:id/route", async (req, res): Promise<void> => {
  if (!requireAdmin(req, res)) return;
  const id = Number(req.params.id);
  const [updated] = await db.update(interestRequestsTable).set({
    status: "pending_candidate",
   adminNote: req.body?.adminNote ? String(req.body.adminNote).slice(0, 1000) : null,
   expiresAt: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000),
  }).where(and(eq(interestRequestsTable.id, id), eq(interestRequestsTable.status, "pending_hmr"))).returning();
  if (!updated) { res.status(404).json({ error: "Request not found or already routed" }); return; }
   await db.insert(hmrAuditEventsTable).values({ interestRequestId: id, actorRole: "hmr", event: "route_to_candidate", metadata: adminMetadata(req) });
  await db.insert(notificationsTable).values({
    recipientProfileId: updated.candidateProfileId, actorProfileId: updated.companyProfileId, type: "system",
    message: "You have a new professional introduction request to review",
  });
  res.json({ id: updated.id, status: updated.status });
});

router.get("/interest-requests/candidate", async (req, res): Promise<void> => {
  const candidateId = Number(req.session?.profileId);
  if (!candidateId) { res.status(401).json({ error: "Authentication required" }); return; }
  const rows = await db.select({
    id: interestRequestsTable.id, status: interestRequestsTable.status, roleTitle: interestRequestsTable.roleTitle,
    companyNote: interestRequestsTable.companyNote, jobId: interestRequestsTable.jobId, createdAt: interestRequestsTable.createdAt,
    expiresAt: interestRequestsTable.expiresAt, releaseExpiresAt: interestRequestsTable.releaseExpiresAt, revokedAt: interestRequestsTable.revokedAt,
  }).from(interestRequestsTable).where(and(eq(interestRequestsTable.candidateProfileId, candidateId), eq(interestRequestsTable.status, "pending_candidate"))).orderBy(desc(interestRequestsTable.createdAt));
  res.json({ requests: rows.filter(row => activeStatus(row.status, row.expiresAt, row.releaseExpiresAt, row.revokedAt) === "pending_candidate") });
});

router.post("/interest-requests/:id/approve", async (req, res): Promise<void> => {
  const candidateId = Number(req.session?.profileId);
  if (!candidateId) { res.status(401).json({ error: "Authentication required" }); return; }
  const id = Number(req.params.id);
   const requestedScope = Array.isArray(req.body?.releaseScope) ? req.body.releaseScope.map(String).filter((s: string) => ["identity", "contact", "currentEmployer", "socialLinks", "portfolio", "experience", "education", "skills"].includes(s)) : [];
   if (!["direct", "hmr_managed"].includes(req.body?.handlingMode)) {
     res.status(400).json({ error: "handlingMode must be direct or hmr_managed" });
     return;
   }
   const hmrManaged = req.body.handlingMode === "hmr_managed";
   // HMR-managed handling is deliberately anonymous to the company. Skills are
   // the only field category that cannot directly identify the professional.
   const scope = hmrManaged ? requestedScope.filter((field: string) => field === "skills") : requestedScope;
   // A direct conversation is an ongoing relationship and necessarily shows
   // participant identity in message history. Profile-field release expiry or
   // revocation does not erase that accepted conversation.
   if (!hmrManaged && !scope.includes("identity")) {
     res.status(400).json({ error: "Identity release is required to open a direct conversation. Choose HMR-managed handling to remain anonymous." });
     return;
   }
  const result = await db.transaction(async (tx) => {
     const [updated] = await tx.update(interestRequestsTable).set({ status: "approved", releaseScope: scope, handlingMode: hmrManaged ? "hmr_managed" : "direct", releaseExpiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), respondedAt: new Date() }).where(and(eq(interestRequestsTable.id, id), eq(interestRequestsTable.candidateProfileId, candidateId), eq(interestRequestsTable.status, "pending_candidate"))).returning();
    if (!updated) return null;
    const [p1, p2] = orderedPair(updated.companyProfileId, candidateId);
     if (hmrManaged) {
       await tx.insert(hmrAuditEventsTable).values({ interestRequestId: id, actorProfileId: candidateId, actorRole: "candidate", event: "candidate_approve_hmr_managed", metadata: { releaseScope: scope, directConversation: false } });
       return updated;
     }
     let [conv] = await tx.select().from(conversationsTable).where(and(eq(conversationsTable.participant1Id, p1), eq(conversationsTable.participant2Id, p2), eq(conversationsTable.type, "direct"))).limit(1);
    if (!conv) [conv] = await tx.insert(conversationsTable).values({ participant1Id: p1, participant2Id: p2, type: "direct" }).returning();
    if (!conv.lastMessageAt) {
      const introMessage = [
        `HMR introduction approved${updated.roleTitle ? ` for ${updated.roleTitle}` : ""}.`,
        updated.companyNote,
      ].filter(Boolean).join(" ");
      const now = new Date();
      await tx.insert(messagesTable).values({
        conversationId: conv.id,
        senderProfileId: updated.companyProfileId,
        content: introMessage.slice(0, 4000),
      });
      await tx.update(conversationsTable).set({
        lastMessageAt: now,
        lastMessagePreview: introMessage.slice(0, 80),
      }).where(eq(conversationsTable.id, conv.id));
    }
    await tx.update(interestRequestsTable).set({ conversationId: conv.id }).where(eq(interestRequestsTable.id, id));
    await tx.insert(hmrAuditEventsTable).values({ interestRequestId: id, actorProfileId: candidateId, actorRole: "candidate", event: "candidate_approve", metadata: { releaseScope: scope, directConversation: true, conversationPersistsAfterProfileRelease: true } });
    await tx.insert(hmrAuditEventsTable).values({ interestRequestId: id, actorProfileId: candidateId, actorRole: "candidate", event: "identity_release", metadata: { releaseScope: scope, directConversation: true } });
    await tx.insert(notificationsTable).values({ recipientProfileId: updated.companyProfileId, actorProfileId: candidateId, type: "system", conversationId: conv.id, message: "A professional accepted your introduction request" });
    return { ...updated, conversationId: conv.id };
  });
  if (!result) { res.status(409).json({ error: "Request was already decided" }); return; }
  res.json(result);
});

router.post("/admin/interest-requests/:id/expire", async (req, res): Promise<void> => {
  if (!requireAdmin(req, res)) return;
  const [updated] = await db.update(interestRequestsTable).set({ status: "expired", expiresAt: new Date(), respondedAt: new Date() })
    .where(and(eq(interestRequestsTable.id, Number(req.params.id)), inArray(interestRequestsTable.status, ["pending", "pending_hmr", "pending_candidate", "approved"]))).returning();
  if (!updated) { res.status(404).json({ error: "Request not found or already closed" }); return; }
  await db.insert(hmrAuditEventsTable).values({ interestRequestId: updated.id, actorRole: "hmr", event: "admin_expire", metadata: adminMetadata(req) });
  res.json(updated);
});

router.post("/admin/interest-requests/:id/revoke", async (req, res): Promise<void> => {
  if (!requireAdmin(req, res)) return;
  const [updated] = await db.update(interestRequestsTable).set({ status: "revoked", revokedAt: new Date(), releaseExpiresAt: new Date() })
    .where(and(eq(interestRequestsTable.id, Number(req.params.id)), eq(interestRequestsTable.status, "approved"))).returning();
  if (!updated) { res.status(404).json({ error: "Approved request not found" }); return; }
  await db.insert(hmrAuditEventsTable).values({ interestRequestId: updated.id, actorRole: "hmr", event: "admin_revoke", metadata: adminMetadata(req) });
  res.json(updated);
});

router.get("/admin/interest-requests/:id/audit", async (req, res): Promise<void> => {
  if (!requireAdmin(req, res)) return;
  const events = await db.select().from(hmrAuditEventsTable).where(eq(hmrAuditEventsTable.interestRequestId, Number(req.params.id))).orderBy(desc(hmrAuditEventsTable.createdAt));
  res.json({ events });
});

router.post("/interest-requests/:id/decline", async (req, res): Promise<void> => {
  const candidateId = Number(req.session?.profileId);
  if (!candidateId) { res.status(401).json({ error: "Authentication required" }); return; }
  const result = await db.transaction(async (tx) => {
    const [updated] = await tx.update(interestRequestsTable).set({ status: "declined_candidate", respondedAt: new Date() }).where(and(eq(interestRequestsTable.id, Number(req.params.id)), eq(interestRequestsTable.candidateProfileId, candidateId), eq(interestRequestsTable.status, "pending_candidate"))).returning();
    if (!updated) return null;
    await tx.insert(hmrAuditEventsTable).values({ interestRequestId: updated.id, actorProfileId: candidateId, actorRole: "candidate", event: "candidate_decline", metadata: {} });
    await tx.insert(notificationsTable).values({ recipientProfileId: updated.companyProfileId, actorProfileId: updated.candidateProfileId, type: "system", message: "Your professional introduction request was declined" });
    return updated;
  });
  if (!result) { res.status(409).json({ error: "Request was already decided" }); return; }
  res.json(result);
});

export default router;
