import { Router } from "express";
import { db } from "@workspace/db";
import { connectionsTable } from "@workspace/db";
import { eq, and, inArray } from "drizzle-orm";

const router = Router();

// ── GET /connections?profileId=:id — list who this profile is following ────────
router.get("/connections", async (req, res): Promise<void> => {
  const profileId = parseInt(req.query.profileId as string, 10);
  if (!profileId) { res.status(400).json({ error: "profileId required" }); return; }

  const rows = await db
    .select({ followingId: connectionsTable.followingId })
    .from(connectionsTable)
    .where(eq(connectionsTable.followerId, profileId));

  res.json(rows.map(r => r.followingId));
});

// ── GET /connections/count?profileId=:id — follower + following counts ─────────
router.get("/connections/count", async (req, res): Promise<void> => {
  const profileId = parseInt(req.query.profileId as string, 10);
  if (!profileId) { res.status(400).json({ error: "profileId required" }); return; }

  const [followingRows, followerRows] = await Promise.all([
    db.select({ id: connectionsTable.id }).from(connectionsTable).where(eq(connectionsTable.followerId, profileId)),
    db.select({ id: connectionsTable.id }).from(connectionsTable).where(eq(connectionsTable.followingId, profileId)),
  ]);

  res.json({ following: followingRows.length, followers: followerRows.length });
});

// ── POST /connections — follow ──────────────────────────────────────────────────
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

// ── DELETE /connections — unfollow ─────────────────────────────────────────────
router.delete("/connections", async (req, res): Promise<void> => {
  const { followerId, followingId } = req.body as { followerId: number; followingId: number };
  if (!followerId || !followingId) { res.status(400).json({ error: "followerId and followingId required" }); return; }

  await db
    .delete(connectionsTable)
    .where(and(eq(connectionsTable.followerId, followerId), eq(connectionsTable.followingId, followingId)));

  res.status(204).send();
});

export default router;
