import { Router } from "express";
import { db, connectionsTable, profilesTable } from "@workspace/db";
import { notificationsTable } from "@workspace/db";
import { eq, and, inArray, notInArray, ne, or, sql, desc } from "drizzle-orm";
import { emitToUser } from "./events";
import { companyReleaseScope, projectProfileForScope } from "../lib/privacyProjection";

const router = Router();

// Helper: accepted condition for a profile in either direction
const acceptedWith = (profileId: number) =>
  and(
    or(
      eq(connectionsTable.followerId, profileId),
      eq(connectionsTable.followingId, profileId),
    ),
    eq(connectionsTable.status, "accepted"),
  );

// Helper: partner ID expression (the other side of the relationship)
const partnerIdExpr = (profileId: number) =>
  sql<number>`CASE WHEN ${connectionsTable.followerId} = ${profileId} THEN ${connectionsTable.followingId} ELSE ${connectionsTable.followerId} END`;

// ── GET /connections — accepted partner IDs (both directions) for current user ─
router.get("/connections", async (req, res): Promise<void> => {
  const profileId = req.session.profileId!;

  const rows = await db
    .select({ partnerId: partnerIdExpr(profileId) })
    .from(connectionsTable)
    .where(acceptedWith(profileId));

  res.json(rows.map(r => r.partnerId));
});

// ── GET /connections/pending — outgoing pending request IDs for current user ──
router.get("/connections/pending", async (req, res): Promise<void> => {
  const profileId = req.session.profileId!;

  const rows = await db
    .select({ followingId: connectionsTable.followingId })
    .from(connectionsTable)
    .where(and(eq(connectionsTable.followerId, profileId), eq(connectionsTable.status, "pending")));

  res.json(rows.map(r => r.followingId));
});

// ── GET /connections/requests — incoming pending requests for current user ─────
router.get("/connections/requests", async (req, res): Promise<void> => {
  const profileId = req.session.profileId!;

  const rows = await db
    .select({
      connectionId: connectionsTable.id,
      requestMessage: connectionsTable.requestMessage,
      createdAt: connectionsTable.createdAt,
      actorId: profilesTable.id,
      actorName: profilesTable.name,
      actorHeadline: profilesTable.headline,
      actorAvatarUrl: profilesTable.avatarUrl,
      actorLocation: profilesTable.location,
    })
    .from(connectionsTable)
    .innerJoin(profilesTable, eq(connectionsTable.followerId, profilesTable.id))
    .where(and(eq(connectionsTable.followingId, profileId), eq(connectionsTable.status, "pending")))
    .orderBy(desc(connectionsTable.createdAt));

  res.json(rows);
});

// ── GET /connections/network — full profiles connected for current user ─────────
router.get("/connections/network", async (req, res): Promise<void> => {
  const profileId = req.session.profileId!;

  const rows = await db
    .select({ partnerId: partnerIdExpr(profileId), createdAt: connectionsTable.createdAt })
    .from(connectionsTable)
    .where(acceptedWith(profileId))
    .orderBy(desc(connectionsTable.createdAt));

  if (rows.length === 0) { res.json({ profiles: [], connections: [], following: [], total: 0, connectionCount: 0, followingCount: 0 }); return; }

  const partnerIds = rows.map(r => r.partnerId);
  const profiles = await db
    .select({
      id: profilesTable.id, accountType: profilesTable.accountType, name: profilesTable.name,
      headline: profilesTable.headline, bio: profilesTable.bio, location: profilesTable.location,
      industry: profilesTable.industry, avatarUrl: profilesTable.avatarUrl, coverUrl: profilesTable.coverUrl,
      website: profilesTable.website, linkedinUrl: profilesTable.linkedinUrl, githubUrl: profilesTable.githubUrl,
      twitterUrl: profilesTable.twitterUrl, interests: profilesTable.interests, openToWork: profilesTable.openToWork,
      customLinks: profilesTable.customLinks, privacySettings: profilesTable.privacySettings,
      indeedUrl: profilesTable.indeedUrl, glassdoorUrl: profilesTable.glassdoorUrl,
      wellfoundUrl: profilesTable.wellfoundUrl, angellistUrl: profilesTable.angellistUrl,
      createdAt: profilesTable.createdAt, updatedAt: profilesTable.updatedAt,
    })
    .from(profilesTable)
    .where(inArray(profilesTable.id, partnerIds));

  const orderMap = Object.fromEntries(partnerIds.map((id, i) => [id, i]));
  profiles.sort((a, b) => (orderMap[a.id] ?? 99) - (orderMap[b.id] ?? 99));

  const projectedProfiles = await Promise.all(profiles.map(async (profile) =>
    profile.accountType === "individual"
      ? projectProfileForScope(profile, await companyReleaseScope(req, profile.id))
      : profile
  ));
  const connections = projectedProfiles.filter(p => p.accountType !== "company");
  const following   = projectedProfiles.filter(p => p.accountType === "company");

  res.json({
    profiles: projectedProfiles,
    connections,
    following,
    total: profiles.length,
    connectionCount: connections.length,
    followingCount: following.length,
  });
});

// ── GET /connections/recommended — smart suggestions for current user ──────────
router.get("/connections/recommended", async (req, res): Promise<void> => {
  const profileId = req.session.profileId!;

  const [myProfile] = await db.select({
    accountType: profilesTable.accountType, industry: profilesTable.industry, interests: profilesTable.interests,
  }).from(profilesTable).where(eq(profilesTable.id, profileId));
  if (!myProfile) { res.json({ profiles: [] }); return; }
  if (myProfile.accountType === "company") {
    res.status(403).json({ error: "Company talent discovery is available through the HMR marketplace." });
    return;
  }

  // Exclude everyone already connected (both directions) or pending
  const connectionRows = await db
    .select({ partnerId: partnerIdExpr(profileId) })
    .from(connectionsTable)
    .where(
      and(
        or(
          eq(connectionsTable.followerId, profileId),
          eq(connectionsTable.followingId, profileId),
        ),
      ),
    );
  const excludeIds = [profileId, ...connectionRows.map(r => r.partnerId)];

  const myIndustry  = myProfile.industry ?? "";
  const myInterests = (myProfile.interests ?? []) as string[];

  // Only suggest individuals — companies are follower targets, not peer connections
  const individualsOnly = and(
    eq(profilesTable.accountType, "individual"),
    eq(profilesTable.discoveryEnabled, true),
    sql`${profilesTable.privacySettings}->>'identity' = 'public'`,
  )!;

  const baseWhere = excludeIds.length > 0
    ? and(individualsOnly, notInArray(profilesTable.id, excludeIds))
    : and(individualsOnly, ne(profilesTable.id, profileId));

  type SafeProfile = {
    id: number; accountType: string; name: string; headline: string; bio: string | null;
    location: string | null; industry: string | null; avatarUrl: string | null; coverUrl: string | null;
    website: string | null; linkedinUrl: string | null; githubUrl: string | null; twitterUrl: string | null;
    interests: string[]; openToWork: boolean; customLinks: Array<{ label: string; url: string }>;
  };
  let recommended: SafeProfile[] = [];
  const safeProfileSelection = {
    id: profilesTable.id, accountType: profilesTable.accountType, name: profilesTable.name,
    headline: profilesTable.headline, bio: profilesTable.bio, location: profilesTable.location,
    industry: profilesTable.industry, avatarUrl: profilesTable.avatarUrl, coverUrl: profilesTable.coverUrl,
    website: profilesTable.website, linkedinUrl: profilesTable.linkedinUrl, githubUrl: profilesTable.githubUrl,
    twitterUrl: profilesTable.twitterUrl, interests: profilesTable.interests, openToWork: profilesTable.openToWork,
    customLinks: profilesTable.customLinks,
    indeedUrl: profilesTable.indeedUrl, glassdoorUrl: profilesTable.glassdoorUrl,
    wellfoundUrl: profilesTable.wellfoundUrl, angellistUrl: profilesTable.angellistUrl,
    createdAt: profilesTable.createdAt, updatedAt: profilesTable.updatedAt,
  };
  let matchedByProfile = false;

  if (myIndustry || myInterests.length > 0) {
    const conditions = [];
    if (myIndustry) conditions.push(eq(profilesTable.industry, myIndustry));
    if (myInterests.length > 0) {
      conditions.push(sql`${profilesTable.interests} && ARRAY[${sql.join(myInterests.map(i => sql`${i}`), sql`, `)}]::text[]`);
    }
    recommended = await db
      .select(safeProfileSelection)
      .from(profilesTable)
      .where(and(baseWhere, or(...conditions)))
      .orderBy(desc(profilesTable.createdAt))
      .limit(20);
    if (recommended.length > 0) matchedByProfile = true;
  }

  if (recommended.length < 8) {
    const already = new Set([...excludeIds, ...recommended.map(p => p.id)]);
    const fallback = await db
      .select(safeProfileSelection)
      .from(profilesTable)
      .where(and(individualsOnly, notInArray(profilesTable.id, [...already])))
      .orderBy(desc(profilesTable.createdAt))
      .limit(20 - recommended.length);
    recommended = [...recommended, ...fallback];
  }

  const projected = await Promise.all(recommended.slice(0, 20).map(async (profile) =>
    projectProfileForScope(profile, await companyReleaseScope(req, profile.id))
  ));
  res.json({ profiles: projected, matchedByProfile });
});

// ── GET /connections/count — connection count for current user ────────────────
router.get("/connections/count", async (req, res): Promise<void> => {
  const profileId = req.session.profileId!;

  const rows = await db
    .select({ id: connectionsTable.id })
    .from(connectionsTable)
    .where(acceptedWith(profileId));

  res.json({ connections: rows.length });
});

// ── POST /connections — send connection request ───────────────────────────────
router.post("/connections", async (req, res): Promise<void> => {
  const followerId = req.session.profileId!;
  const { followingId, message } = req.body as { followingId: number; message?: string };
  if (!followingId) { res.status(400).json({ error: "followingId required" }); return; }
  if (followerId === Number(followingId)) { res.status(400).json({ error: "Cannot connect with yourself" }); return; }

  // Companies are followed immediately (no approval needed)
  const [targetProfile] = await db
    .select({ accountType: profilesTable.accountType })
    .from(profilesTable)
    .where(eq(profilesTable.id, followingId));
  if (!targetProfile) {
    res.status(404).json({ error: "Profile not found" });
    return;
  }
  const isCompanyTarget = targetProfile?.accountType === "company";

  // Company-to-individual outreach is mediated by HMR. Companies must use
  // Express Interest; ordinary connection requests are for peer networking.
  const [followerProfile] = await db
    .select({ accountType: profilesTable.accountType })
    .from(profilesTable)
    .where(eq(profilesTable.id, followerId));
  if (followerProfile?.accountType === "company" && targetProfile.accountType === "individual") {
    res.status(403).json({
      error: "mediated_only",
      message: "Use Express Interest to contact an individual candidate.",
    });
    return;
  }

  const [row] = await db
    .insert(connectionsTable)
    .values({
      followerId,
      followingId,
      status: isCompanyTarget ? "accepted" : "pending",
      requestMessage: message?.trim() || null,
    })
    .onConflictDoNothing()
    .returning();

  if (row && !isCompanyTarget) {
    const [actor] = await db
      .select({ name: profilesTable.name })
      .from(profilesTable)
      .where(eq(profilesTable.id, followerId));

    if (actor) {
      await db.insert(notificationsTable).values({
        recipientProfileId: followingId,
        actorProfileId: followerId,
        type: "connection_request",
        message: `${actor.name} sent you a connection request`,
        isRead: false,
      });
    }
  }

  res.status(201).json(row ?? { followerId, followingId, status: isCompanyTarget ? "accepted" : "pending" });
});

// ── PATCH /connections/accept — accept a pending request ──────────────────────
router.patch("/connections/accept", async (req, res): Promise<void> => {
  const { followerId } = req.body as { followerId: number };
  const followingId = req.session.profileId!;
  if (!followerId) { res.status(400).json({ error: "followerId required" }); return; }

  const [updated] = await db
    .update(connectionsTable)
    .set({ status: "accepted" })
    .where(and(eq(connectionsTable.followerId, followerId), eq(connectionsTable.followingId, followingId), eq(connectionsTable.status, "pending")))
    .returning();

  if (!updated) { res.status(404).json({ error: "Pending request not found" }); return; }

  const [acceptor] = await db
    .select({ name: profilesTable.name })
    .from(profilesTable)
    .where(eq(profilesTable.id, followingId));

  if (acceptor) {
    await db.insert(notificationsTable).values({
      recipientProfileId: followerId,
      actorProfileId: followingId,
      type: "connection_accepted",
      message: `${acceptor.name} accepted your connection request`,
      isRead: false,
    });
  }

  // Push real-time event to both sides so they refresh without a page reload
  emitToUser(followerId,  { type: "connection_accepted", withProfileId: followingId });
  emitToUser(followingId, { type: "connection_accepted", withProfileId: followerId });

  res.json(updated);
});

// ── DELETE /connections — disconnect or decline (uses session as current user) ─
router.delete("/connections", async (req, res): Promise<void> => {
  const myId = req.session.profileId!;
  const { targetId } = req.body as { targetId: number };
  if (!targetId) { res.status(400).json({ error: "targetId required" }); return; }

  const target = Number(targetId);

  // Delete regardless of which side created the record (bidirectional search)
  await db
    .delete(connectionsTable)
    .where(
      or(
        and(eq(connectionsTable.followerId, myId), eq(connectionsTable.followingId, target)),
        and(eq(connectionsTable.followerId, target), eq(connectionsTable.followingId, myId)),
      ),
    );

  // Notify both parties in real-time (covers decline + disconnect cases)
  emitToUser(myId,    { type: "connection_removed", withProfileId: target });
  emitToUser(target,  { type: "connection_removed", withProfileId: myId });

  res.status(204).send();
});

export default router;
