import { Router, type IRouter } from "express";
import { eq, and, desc } from "drizzle-orm";
import {
  db,
  offerLettersTable,
  applicationsTable,
  profilesTable,
  jobsTable,
  notificationsTable,
  conversationsTable,
  conversationMembersTable,
  messagesTable,
} from "@workspace/db";

const router: IRouter = Router();

// ── POST /api/offer-letters — create and optionally send an offer letter ──────
router.post("/offer-letters", async (req, res): Promise<void> => {
  const { applicationId, companyProfileId, candidateProfileId, templateName, renderedHtml, sendViaMessage, token: clientToken, offerUrl } = req.body;

  if (!applicationId || !companyProfileId || !candidateProfileId || !renderedHtml) {
    res.status(400).json({ error: "applicationId, companyProfileId, candidateProfileId, renderedHtml are required" });
    return;
  }

  const appId = Number(applicationId);
  const companyId = Number(companyProfileId);
  const candidateId = Number(candidateProfileId);

  // Verify ownership: application must belong to a job posted by this company
  const [app] = await db.select().from(applicationsTable).where(eq(applicationsTable.id, appId));
  if (!app) {
    res.status(404).json({ error: "Application not found" });
    return;
  }
  const [job] = await db.select().from(jobsTable).where(eq(jobsTable.id, app.jobId));
  if (!job || job.companyProfileId !== companyId) {
    res.status(403).json({ error: "Forbidden" });
    return;
  }

  // Upsert: if an offer letter already exists for this application, update it
  const existing = await db
    .select()
    .from(offerLettersTable)
    .where(eq(offerLettersTable.applicationId, appId))
    .orderBy(desc(offerLettersTable.createdAt))
    .limit(1);

  let offerLetter;
  if (existing.length > 0) {
    const [updated] = await db
      .update(offerLettersTable)
      .set({
        renderedHtml: String(renderedHtml),
        templateName: templateName ? String(templateName) : "full-time",
        status: "sent",
        sentAt: new Date(),
        ...(clientToken ? { token: String(clientToken) } : {}),
      })
      .where(eq(offerLettersTable.id, existing[0].id))
      .returning();
    offerLetter = updated;
  } else {
    const [created] = await db.insert(offerLettersTable).values({
      applicationId: appId,
      companyProfileId: companyId,
      candidateProfileId: candidateId,
      templateName: templateName ? String(templateName) : "full-time",
      renderedHtml: String(renderedHtml),
      status: "sent",
      sentAt: new Date(),
      ...(clientToken ? { token: String(clientToken) } : {}),
    }).returning();
    offerLetter = created;
  }

  // Optionally send via platform message + notification
  if (sendViaMessage) {
    try {
      const [companyProfile] = await db.select().from(profilesTable).where(eq(profilesTable.id, companyId));
      const resolvedUrl = offerUrl
        ?? (req.headers.origin ? `${req.headers.origin}/offer/${offerLetter.token}` : `/offer/${offerLetter.token}`);
      const messageText = `Hi! ${companyProfile?.name ?? "The company"} has sent you an offer letter for the ${job.title} position. Review and sign here: ${resolvedUrl}`;

      // Find or create direct conversation
      const p1 = Math.min(companyId, candidateId);
      const p2 = Math.max(companyId, candidateId);

      let [conv] = await db
        .select()
        .from(conversationsTable)
        .where(
          and(
            eq(conversationsTable.participant1Id, p1),
            eq(conversationsTable.participant2Id, p2),
            eq(conversationsTable.type, "direct"),
          ),
        )
        .limit(1);

      if (!conv) {
        const [created] = await db
          .insert(conversationsTable)
          .values({ participant1Id: p1, participant2Id: p2, type: "direct", lastMessageAt: new Date(), lastMessagePreview: messageText.slice(0, 100) })
          .returning();
        conv = created;
        await db.insert(conversationMembersTable).values([
          { conversationId: conv.id, profileId: companyId },
          { conversationId: conv.id, profileId: candidateId },
        ]).onConflictDoNothing();
      }

      await db.insert(messagesTable).values({
        conversationId: conv.id,
        senderProfileId: companyId,
        content: messageText,
      });

      await db
        .update(conversationsTable)
        .set({ lastMessageAt: new Date(), lastMessagePreview: messageText.slice(0, 100) })
        .where(eq(conversationsTable.id, conv.id));

      // Notification to candidate
      await db.insert(notificationsTable).values({
        recipientProfileId: candidateId,
        actorProfileId: companyId,
        type: "offer_sent",
        conversationId: conv.id,
        message: `${companyProfile?.name ?? "A company"} sent you an offer for ${job.title}`,
      });
    } catch {
      // Non-fatal: offer letter is still created even if messaging fails
    }
  }

  res.status(201).json(offerLetter);
});

// ── GET /api/offer-letters/:token — public, no auth ───────────────────────────
router.get("/offer-letters/:token", async (req, res): Promise<void> => {
  const { token } = req.params;
  const [offerLetter] = await db
    .select()
    .from(offerLettersTable)
    .where(eq(offerLettersTable.token, token));

  if (!offerLetter) {
    res.status(404).json({ error: "Offer letter not found" });
    return;
  }

  // Fetch enrichment (job title, company name) for the signing page
  const [app] = await db.select().from(applicationsTable).where(eq(applicationsTable.id, offerLetter.applicationId));
  const [job] = app ? await db.select().from(jobsTable).where(eq(jobsTable.id, app.jobId)) : [null];
  const [company] = await db.select().from(profilesTable).where(eq(profilesTable.id, offerLetter.companyProfileId));
  const [candidate] = await db.select().from(profilesTable).where(eq(profilesTable.id, offerLetter.candidateProfileId));

  res.json({
    ...offerLetter,
    jobTitle: job?.title ?? null,
    companyName: company?.name ?? null,
    candidateName: candidate?.name ?? null,
  });
});

// ── PATCH /api/offer-letters/:token/respond — public, no auth ─────────────────
router.patch("/offer-letters/:token/respond", async (req, res): Promise<void> => {
  const { token } = req.params;
  const { response } = req.body;

  if (!response || !["accepted", "declined"].includes(response)) {
    res.status(400).json({ error: "response must be 'accepted' or 'declined'" });
    return;
  }

  const [offerLetter] = await db
    .select()
    .from(offerLettersTable)
    .where(eq(offerLettersTable.token, token));

  if (!offerLetter) {
    res.status(404).json({ error: "Offer letter not found" });
    return;
  }

  if (offerLetter.status !== "sent") {
    res.json({ ...offerLetter, alreadyResponded: true });
    return;
  }

  const [updated] = await db
    .update(offerLettersTable)
    .set({ status: response, signedAt: new Date() })
    .where(eq(offerLettersTable.token, token))
    .returning();

  // Notify the company
  try {
    const [candidate] = await db.select().from(profilesTable).where(eq(profilesTable.id, offerLetter.candidateProfileId));
    const [app] = await db.select().from(applicationsTable).where(eq(applicationsTable.id, offerLetter.applicationId));
    const [job] = app ? await db.select().from(jobsTable).where(eq(jobsTable.id, app.jobId)) : [null];

    await db.insert(notificationsTable).values({
      recipientProfileId: offerLetter.companyProfileId,
      actorProfileId: offerLetter.candidateProfileId,
      type: response === "accepted" ? "offer_accepted" : "offer_declined",
      message: response === "accepted"
        ? `${candidate?.name ?? "The candidate"} accepted your offer for ${job?.title ?? "the role"}`
        : `${candidate?.name ?? "The candidate"} declined your offer for ${job?.title ?? "the role"}`,
    });
  } catch {
    // Non-fatal
  }

  res.json(updated);
});

// ── GET /api/applications/:id/offer-letter ────────────────────────────────────
// Requires ?companyProfileId=<N> — verifies requester owns the job the application belongs to.
router.get("/applications/:id/offer-letter", async (req, res): Promise<void> => {
  const id = Number(req.params.id);
  const companyProfileId = Number(req.query.companyProfileId);
  if (!id || isNaN(id) || !companyProfileId || isNaN(companyProfileId)) {
    res.status(400).json({ error: "Valid id and companyProfileId are required" });
    return;
  }

  // Ownership: the application must belong to a job posted by this company
  const [app] = await db.select().from(applicationsTable).where(eq(applicationsTable.id, id));
  if (!app) {
    res.status(404).json({ error: "Application not found" });
    return;
  }
  const [job] = await db.select().from(jobsTable).where(eq(jobsTable.id, app.jobId));
  if (!job || job.companyProfileId !== companyProfileId) {
    res.status(403).json({ error: "Forbidden" });
    return;
  }

  const [offerLetter] = await db
    .select()
    .from(offerLettersTable)
    .where(eq(offerLettersTable.applicationId, id))
    .orderBy(desc(offerLettersTable.createdAt))
    .limit(1);

  if (!offerLetter) {
    res.status(404).json({ error: "No offer letter found" });
    return;
  }
  res.json(offerLetter);
});

export default router;
