import { Router } from "express";
import { db, connectionsTable, profilesTable } from "@workspace/db";
import { notificationsTable } from "@workspace/db";
import { eq, and, inArray, notInArray, ne, or, sql, desc } from "drizzle-orm";
import { emitToUser } from "./events";

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

// ── GET /connections?profileId=:id — accepted partner IDs (both directions) ──
router.get("/connections", async (req, res): Promise<void> => {
  const profileId = parseInt(req.query.profileId as string, 10);
  if (!profileId) { res.status(400).json({ error: "profileId required" }); return; }

  const rows = await db
    .select({ partnerId: partnerIdExpr(profileId) })
    .from(connectionsTable)
    .where(acceptedWith(profileId));

  res.json(rows.map(r => r.partnerId));
});

// ── GET /connections/pending?profileId=:id — outgoing pending request IDs ────
router.get("/connections/pending", async (req, res): Promise<void> => {
  const profileId = parseInt(req.query.profileId as string, 10);
  if (!profileId) { res.status(400).json({ error: "profileId required" }); return; }

  const rows = await db
    .select({ followingId: connectionsTable.followingId })
    .from(connectionsTable)
    .where(and(eq(connectionsTable.followerId, profileId), eq(connectionsTable.status, "pending")));

  res.json(rows.map(r => r.followingId));
});

// ── GET /connections/requests?profileId=:id — incoming pending requests ───────
router.get("/connections/requests", async (req, res): Promise<void> => {
  const profileId = parseInt(req.query.profileId as string, 10);
  if (!profileId) { res.status(400).json({ error: "profileId required" }); return; }

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

// ── GET /connections/network?profileId=:id — full profiles connected (both dirs)
router.get("/connections/network", async (req, res): Promise<void> => {
  const profileId = parseInt(req.query.profileId as string, 10);
  if (!profileId) { res.status(400).json({ error: "profileId required" }); return; }

  const rows = await db
    .select({ partnerId: partnerIdExpr(profileId), createdAt: connectionsTable.createdAt })
    .from(connectionsTable)
    .where(acceptedWith(profileId))
    .orderBy(desc(connectionsTable.createdAt));

  if (rows.length === 0) { res.json({ profiles: [], connections: [], following: [], total: 0, connectionCount: 0, followingCount: 0 }); return; }

  const partnerIds = rows.map(r => r.partnerId);
  const profiles = await db
    .select()
    .from(profilesTable)
    .where(inArray(profilesTable.id, partnerIds));

  const orderMap = Object.fromEntries(partnerIds.map((id, i) => [id, i]));
  profiles.sort((a, b) => (orderMap[a.id] ?? 99) - (orderMap[b.id] ?? 99));

  const connections = profiles.filter(p => p.accountType !== "company");
  const following   = profiles.filter(p => p.accountType === "company");

  res.json({
    profiles,
    connections,
    following,
    total: profiles.length,
    connectionCount: connections.length,
    followingCount: following.length,
  });
});

// ── GET /connections/recommended?profileId=:id — smart suggestions ────────────
router.get("/connections/recommended", async (req, res): Promise<void> => {
  const profileId = parseInt(req.query.profileId as string, 10);
  if (!profileId) { res.status(400).json({ error: "profileId required" }); return; }

  const [myProfile] = await db.select().from(profilesTable).where(eq(profilesTable.id, profileId));
  if (!myProfile) { res.json({ profiles: [] }); return; }

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

  const baseWhere = excludeIds.length > 0
    ? notInArray(profilesTable.id, excludeIds)
    : ne(profilesTable.id, profileId);

  let recommended: typeof profilesTable.$inferSelect[] = [];

  if (myIndustry || myInterests.length > 0) {
    const conditions = [];
    if (myIndustry) conditions.push(eq(profilesTable.industry, myIndustry));
    if (myInterests.length > 0) {
      conditions.push(sql`${profilesTable.interests} && ARRAY[${sql.join(myInterests.map(i => sql`${i}`), sql`, `)}]::text[]`);
    }
    recommended = await db
      .select()
      .from(profilesTable)
      .where(and(baseWhere, or(...conditions)))
      .orderBy(desc(profilesTable.createdAt))
      .limit(20);
  }

  if (recommended.length < 8) {
    const already = new Set([...excludeIds, ...recommended.map(p => p.id)]);
    const fallback = await db
      .select()
      .from(profilesTable)
      .where(notInArray(profilesTable.id, [...already]))
      .orderBy(desc(profilesTable.createdAt))
      .limit(20 - recommended.length);
    recommended = [...recommended, ...fallback];
  }

  res.json({ profiles: recommended.slice(0, 20) });
});

// ── GET /connections/count?profileId=:id ──────────────────────────────────────
router.get("/connections/count", async (req, res): Promise<void> => {
  const profileId = parseInt(req.query.profileId as string, 10);
  if (!profileId) { res.status(400).json({ error: "profileId required" }); return; }

  const rows = await db
    .select({ id: connectionsTable.id })
    .from(connectionsTable)
    .where(acceptedWith(profileId));

  res.json({ connections: rows.length });
});

// ── POST /connections — send connection request ───────────────────────────────
router.post("/connections", async (req, res): Promise<void> => {
  const { followerId, followingId, message } = req.body as { followerId: number; followingId: number; message?: string };
  if (!followerId || !followingId) { res.status(400).json({ error: "followerId and followingId required" }); return; }
  if (followerId === followingId) { res.status(400).json({ error: "Cannot connect with yourself" }); return; }

  // Companies are followed immediately (no approval needed)
  const [targetProfile] = await db
    .select({ accountType: profilesTable.accountType })
    .from(profilesTable)
    .where(eq(profilesTable.id, followingId));
  const isCompanyTarget = targetProfile?.accountType === "company";

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
  const { followerId, followingId } = req.body as { followerId: number; followingId: number };
  if (!followerId || !followingId) { res.status(400).json({ error: "followerId and followingId required" }); return; }

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

// ── DELETE /connections — disconnect or decline (finds record in either direction)
router.delete("/connections", async (req, res): Promise<void> => {
  const { followerId, followingId } = req.body as { followerId: number; followingId: number };
  if (!followerId || !followingId) { res.status(400).json({ error: "followerId and followingId required" }); return; }

  // Delete regardless of which side created the record (bidirectional search)
  await db
    .delete(connectionsTable)
    .where(
      or(
        and(eq(connectionsTable.followerId, followerId), eq(connectionsTable.followingId, followingId)),
        and(eq(connectionsTable.followerId, followingId), eq(connectionsTable.followingId, followerId)),
      ),
    );

  // Notify both parties in real-time (covers decline + disconnect cases)
  emitToUser(followerId,  { type: "connection_removed", withProfileId: followingId });
  emitToUser(followingId, { type: "connection_removed", withProfileId: followerId });

  res.status(204).send();
});

export default router;
