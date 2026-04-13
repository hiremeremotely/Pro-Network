import { Router } from "express";
import { db, connectionsTable, profilesTable } from "@workspace/db";
import { eq, and, inArray, notInArray, ne, or, sql, desc } from "drizzle-orm";

const router = Router();

// ── GET /connections?profileId=:id — list IDs this profile follows ────────────
router.get("/connections", async (req, res): Promise<void> => {
  const profileId = parseInt(req.query.profileId as string, 10);
  if (!profileId) { res.status(400).json({ error: "profileId required" }); return; }

  const rows = await db
    .select({ followingId: connectionsTable.followingId })
    .from(connectionsTable)
    .where(eq(connectionsTable.followerId, profileId));

  res.json(rows.map(r => r.followingId));
});

// ── GET /connections/network?profileId=:id — full profiles I follow ───────────
router.get("/connections/network", async (req, res): Promise<void> => {
  const profileId = parseInt(req.query.profileId as string, 10);
  if (!profileId) { res.status(400).json({ error: "profileId required" }); return; }

  const followingRows = await db
    .select({ followingId: connectionsTable.followingId, createdAt: connectionsTable.createdAt })
    .from(connectionsTable)
    .where(eq(connectionsTable.followerId, profileId))
    .orderBy(desc(connectionsTable.createdAt));

  if (followingRows.length === 0) { res.json({ profiles: [], total: 0 }); return; }

  const followingIds = followingRows.map(r => r.followingId);

  const profiles = await db
    .select()
    .from(profilesTable)
    .where(inArray(profilesTable.id, followingIds));

  // sort by most recently followed
  const orderMap = Object.fromEntries(followingIds.map((id, i) => [id, i]));
  profiles.sort((a, b) => (orderMap[a.id] ?? 99) - (orderMap[b.id] ?? 99));

  res.json({ profiles, total: profiles.length });
});

// ── GET /connections/recommended?profileId=:id — smart suggestions ────────────
router.get("/connections/recommended", async (req, res): Promise<void> => {
  const profileId = parseInt(req.query.profileId as string, 10);
  if (!profileId) { res.status(400).json({ error: "profileId required" }); return; }

  // Get my profile for industry/interests matching
  const [myProfile] = await db.select().from(profilesTable).where(eq(profilesTable.id, profileId));
  if (!myProfile) { res.json({ profiles: [] }); return; }

  // Who I already follow
  const followingRows = await db
    .select({ followingId: connectionsTable.followingId })
    .from(connectionsTable)
    .where(eq(connectionsTable.followerId, profileId));
  const excludeIds = [profileId, ...followingRows.map(r => r.followingId)];

  const myIndustry   = myProfile.industry ?? "";
  const myInterests  = (myProfile.interests ?? []) as string[];

  const baseWhere = excludeIds.length > 0
    ? notInArray(profilesTable.id, excludeIds)
    : ne(profilesTable.id, profileId);

  let recommended: typeof profilesTable.$inferSelect[] = [];

  // 1) Try same industry OR overlapping interests
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

  // 2) Fall back to newest members if not enough
  if (recommended.length < 8) {
    const already = new Set([...excludeIds, ...recommended.map(p => p.id)]);
    const fallback = await db
      .select()
      .from(profilesTable)
      .where(and(
        notInArray(profilesTable.id, [...already]),
      ))
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
    db.select({ id: connectionsTable.id }).from(connectionsTable).where(eq(connectionsTable.followerId, profileId)),
    db.select({ id: connectionsTable.id }).from(connectionsTable).where(eq(connectionsTable.followingId, profileId)),
  ]);

  res.json({ following: followingRows.length, followers: followerRows.length });
});

// ── POST /connections — follow ─────────────────────────────────────────────────
router.post("/connections", async (req, res): Promise<void> => {
  const { followerId, followingId } = req.body as { followerId: number; followingId: number };
  if (!followerId || !followingId) { res.status(400).json({ error: "followerId and followingId required" }); return; }
  if (followerId === followingId) { res.status(400).json({ error: "Cannot follow yourself" }); return; }

  const [row] = await db
    .insert(connectionsTable)
    .values({ followerId, followingId })
    .onConflictDoNothing()
    .returning();

  res.status(201).json(row ?? { followerId, followingId });
});

// ── DELETE /connections — unfollow ────────────────────────────────────────────
router.delete("/connections", async (req, res): Promise<void> => {
  const { followerId, followingId } = req.body as { followerId: number; followingId: number };
  if (!followerId || !followingId) { res.status(400).json({ error: "followerId and followingId required" }); return; }

  await db
    .delete(connectionsTable)
    .where(and(eq(connectionsTable.followerId, followerId), eq(connectionsTable.followingId, followingId)));

  res.status(204).send();
});

export default router;
