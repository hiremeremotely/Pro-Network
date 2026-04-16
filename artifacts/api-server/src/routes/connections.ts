import { Router } from "express";
import { db, connectionsTable, profilesTable } from "@workspace/db";
import { notificationsTable } from "@workspace/db";
import { eq, and, inArray, notInArray, ne, or, sql, desc } from "drizzle-orm";

const router = Router();

// ── GET /connections?profileId=:id — accepted followingIds ───────────────────
router.get("/connections", async (req, res): Promise<void> => {
  const profileId = parseInt(req.query.profileId as string, 10);
  if (!profileId) { res.status(400).json({ error: "profileId required" }); return; }

  const rows = await db
    .select({ followingId: connectionsTable.followingId })
    .from(connectionsTable)
    .where(and(eq(connectionsTable.followerId, profileId), eq(connectionsTable.status, "accepted")));

  res.json(rows.map(r => r.followingId));
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

// ── GET /connections/network?profileId=:id — full profiles I'm connected with ─
router.get("/connections/network", async (req, res): Promise<void> => {
  const profileId = parseInt(req.query.profileId as string, 10);
  if (!profileId) { res.status(400).json({ error: "profileId required" }); return; }

  const followingRows = await db
    .select({ followingId: connectionsTable.followingId, createdAt: connectionsTable.createdAt })
    .from(connectionsTable)
    .where(and(eq(connectionsTable.followerId, profileId), eq(connectionsTable.status, "accepted")))
    .orderBy(desc(connectionsTable.createdAt));

  if (followingRows.length === 0) { res.json({ profiles: [], total: 0 }); return; }

  const followingIds = followingRows.map(r => r.followingId);
  const profiles = await db
    .select()
    .from(profilesTable)
    .where(inArray(profilesTable.id, followingIds));

  const orderMap = Object.fromEntries(followingIds.map((id, i) => [id, i]));
  profiles.sort((a, b) => (orderMap[a.id] ?? 99) - (orderMap[b.id] ?? 99));

  res.json({ profiles, total: profiles.length });
});

// ── GET /connections/recommended?profileId=:id — smart suggestions ────────────
router.get("/connections/recommended", async (req, res): Promise<void> => {
  const profileId = parseInt(req.query.profileId as string, 10);
  if (!profileId) { res.status(400).json({ error: "profileId required" }); return; }

  const [myProfile] = await db.select().from(profilesTable).where(eq(profilesTable.id, profileId));
  if (!myProfile) { res.json({ profiles: [] }); return; }

  const connectionRows = await db
    .select({ followingId: connectionsTable.followingId })
    .from(connectionsTable)
    .where(eq(connectionsTable.followerId, profileId));
  const excludeIds = [profileId, ...connectionRows.map(r => r.followingId)];

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

  const [followingRows, followerRows] = await Promise.all([
    db.select({ id: connectionsTable.id }).from(connectionsTable).where(and(eq(connectionsTable.followerId, profileId), eq(connectionsTable.status, "accepted"))),
    db.select({ id: connectionsTable.id }).from(connectionsTable).where(and(eq(connectionsTable.followingId, profileId), eq(connectionsTable.status, "accepted"))),
  ]);

  res.json({ following: followingRows.length, followers: followerRows.length });
});

// ── POST /connections — send connection request ───────────────────────────────
router.post("/connections", async (req, res): Promise<void> => {
  const { followerId, followingId, message } = req.body as { followerId: number; followingId: number; message?: string };
  if (!followerId || !followingId) { res.status(400).json({ error: "followerId and followingId required" }); return; }
  if (followerId === followingId) { res.status(400).json({ error: "Cannot connect with yourself" }); return; }

  const [row] = await db
    .insert(connectionsTable)
    .values({
      followerId,
      followingId,
      status: "pending",
      requestMessage: message?.trim() || null,
    })
    .onConflictDoNothing()
    .returning();

  if (row) {
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

  res.status(201).json(row ?? { followerId, followingId, status: "pending" });
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

  res.json(updated);
});

// ── DELETE /connections — decline or withdraw ─────────────────────────────────
router.delete("/connections", async (req, res): Promise<void> => {
  const { followerId, followingId } = req.body as { followerId: number; followingId: number };
  if (!followerId || !followingId) { res.status(400).json({ error: "followerId and followingId required" }); return; }

  await db
    .delete(connectionsTable)
    .where(and(eq(connectionsTable.followerId, followerId), eq(connectionsTable.followingId, followingId)));

  res.status(204).send();
});

export default router;
