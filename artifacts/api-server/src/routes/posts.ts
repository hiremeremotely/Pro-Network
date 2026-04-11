import { Router } from "express";
import { db } from "@workspace/db";
import { postsTable, postReactionsTable, profilesTable } from "@workspace/db";
import { desc, eq, sql, inArray } from "drizzle-orm";

const router = Router();

// ── GET /posts ─────────────────────────────────────────────────────────────
router.get("/posts", async (req, res): Promise<void> => {
  const myProfileId = req.query.profileId ? Number(req.query.profileId) : null;

  const posts = await db
    .select({
      id: postsTable.id,
      content: postsTable.content,
      imageUrl: postsTable.imageUrl,
      likesCount: postsTable.likesCount,
      commentsCount: postsTable.commentsCount,
      createdAt: postsTable.createdAt,
      profileId: profilesTable.id,
      profileName: profilesTable.name,
      profileHeadline: profilesTable.headline,
      profileAvatarUrl: profilesTable.avatarUrl,
      profileAccountType: profilesTable.accountType,
    })
    .from(postsTable)
    .innerJoin(profilesTable, eq(postsTable.profileId, profilesTable.id))
    .orderBy(desc(postsTable.createdAt))
    .limit(50);

  if (posts.length === 0) { res.json([]); return; }

  const postIds = posts.map(p => p.id);

  // Reaction counts per post per type
  const reactionRows = await db
    .select({
      postId: postReactionsTable.postId,
      reactionType: postReactionsTable.reactionType,
      count: sql<number>`count(*)::int`,
    })
    .from(postReactionsTable)
    .where(inArray(postReactionsTable.postId, postIds))
    .groupBy(postReactionsTable.postId, postReactionsTable.reactionType);

  // My reactions
  const myReactionRows = myProfileId
    ? await db
        .select({ postId: postReactionsTable.postId, reactionType: postReactionsTable.reactionType })
        .from(postReactionsTable)
        .where(inArray(postReactionsTable.postId, postIds))
        .then(rows => rows.filter(r => r.postId !== null))
    : [];

  // But we need to filter by profile_id — redo with AND condition
  const myReactions: Record<number, string> = {};
  if (myProfileId) {
    const myRows = await db
      .select({ postId: postReactionsTable.postId, reactionType: postReactionsTable.reactionType })
      .from(postReactionsTable)
      .where(
        sql`${postReactionsTable.postId} = ANY(${sql.raw(`ARRAY[${postIds.join(",")}]::int[]`)}) AND ${postReactionsTable.profileId} = ${myProfileId}`
      );
    myRows.forEach(r => { myReactions[r.postId] = r.reactionType; });
  }

  // Build reactionCounts map: postId → { like: 3, celebrate: 1, ... }
  const reactionCounts: Record<number, Record<string, number>> = {};
  postIds.forEach(id => { reactionCounts[id] = {}; });
  reactionRows.forEach(r => {
    if (!reactionCounts[r.postId]) reactionCounts[r.postId] = {};
    reactionCounts[r.postId][r.reactionType] = r.count;
  });

  const enriched = posts.map(p => ({
    ...p,
    reactionCounts: reactionCounts[p.id] ?? {},
    myReaction: myReactions[p.id] ?? null,
  }));

  res.json(enriched);
});

// ── POST /posts ─────────────────────────────────────────────────────────────
router.post("/posts", async (req, res): Promise<void> => {
  const { profileId, content, imageUrl } = req.body;
  if (!profileId || !content || typeof content !== "string" || content.trim().length === 0) {
    res.status(400).json({ error: "profileId and content are required" });
    return;
  }
  const [post] = await db
    .insert(postsTable)
    .values({ profileId: Number(profileId), content: content.trim(), imageUrl: imageUrl ?? null })
    .returning();
  res.status(201).json(post);
});

// ── PUT /posts/:id ───────────────────────────────────────────────────────────
router.put("/posts/:id", async (req, res): Promise<void> => {
  const id = Number(req.params.id);
  if (isNaN(id)) { res.status(400).json({ error: "Invalid id" }); return; }
  const { content, imageUrl } = req.body;
  if (!content || typeof content !== "string" || content.trim().length === 0) {
    res.status(400).json({ error: "content is required" });
    return;
  }
  const [updated] = await db
    .update(postsTable)
    .set({ content: content.trim(), imageUrl: imageUrl ?? null })
    .where(eq(postsTable.id, id))
    .returning();
  if (!updated) { res.status(404).json({ error: "Post not found" }); return; }
  res.json(updated);
});

// ── DELETE /posts/:id ────────────────────────────────────────────────────────
router.delete("/posts/:id", async (req, res): Promise<void> => {
  const id = Number(req.params.id);
  if (isNaN(id)) { res.status(400).json({ error: "Invalid id" }); return; }
  await db.delete(postsTable).where(eq(postsTable.id, id));
  res.json({ success: true });
});

// ── POST /posts/:id/react ────────────────────────────────────────────────────
// Body: { profileId, reactionType }
// Upserts the reaction; if same type already exists → removes it (toggle)
router.post("/posts/:id/react", async (req, res): Promise<void> => {
  const postId = Number(req.params.id);
  if (isNaN(postId)) { res.status(400).json({ error: "Invalid id" }); return; }

  const { profileId, reactionType } = req.body;
  if (!profileId || !reactionType) {
    res.status(400).json({ error: "profileId and reactionType are required" });
    return;
  }

  const pid = Number(profileId);

  // Check existing reaction for this user on this post
  const [existing] = await db
    .select()
    .from(postReactionsTable)
    .where(sql`${postReactionsTable.postId} = ${postId} AND ${postReactionsTable.profileId} = ${pid}`)
    .limit(1);

  if (existing) {
    if (existing.reactionType === reactionType) {
      // Same reaction → toggle off (remove)
      await db.delete(postReactionsTable).where(eq(postReactionsTable.id, existing.id));
      // Decrement likesCount
      await db.update(postsTable)
        .set({ likesCount: sql`GREATEST(${postsTable.likesCount} - 1, 0)` })
        .where(eq(postsTable.id, postId));
      res.json({ action: "removed", reactionType: null });
    } else {
      // Different reaction → update type (no count change)
      await db.update(postReactionsTable)
        .set({ reactionType })
        .where(eq(postReactionsTable.id, existing.id));
      res.json({ action: "changed", reactionType });
    }
  } else {
    // No existing reaction → insert
    await db.insert(postReactionsTable).values({ postId, profileId: pid, reactionType });
    await db.update(postsTable)
      .set({ likesCount: sql`${postsTable.likesCount} + 1` })
      .where(eq(postsTable.id, postId));
    res.json({ action: "added", reactionType });
  }
});

// ── Keep old /like route as alias ────────────────────────────────────────────
router.post("/posts/:id/like", async (req, res): Promise<void> => {
  const id = Number(req.params.id);
  if (isNaN(id)) { res.status(400).json({ error: "Invalid id" }); return; }
  await db.update(postsTable)
    .set({ likesCount: sql`${postsTable.likesCount} + 1` })
    .where(eq(postsTable.id, id));
  res.json({ success: true });
});

export default router;
