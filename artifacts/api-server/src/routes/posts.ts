import { Router } from "express";
import { db } from "@workspace/db";
import { postsTable, postReactionsTable, postCommentsTable, profilesTable } from "@workspace/db";
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

  // Build reactionCounts map
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
router.post("/posts/:id/react", async (req, res): Promise<void> => {
  const postId = Number(req.params.id);
  if (isNaN(postId)) { res.status(400).json({ error: "Invalid id" }); return; }

  const { profileId, reactionType } = req.body;
  if (!profileId || !reactionType) {
    res.status(400).json({ error: "profileId and reactionType are required" });
    return;
  }

  const pid = Number(profileId);
  const [existing] = await db
    .select()
    .from(postReactionsTable)
    .where(sql`${postReactionsTable.postId} = ${postId} AND ${postReactionsTable.profileId} = ${pid}`)
    .limit(1);

  if (existing) {
    if (existing.reactionType === reactionType) {
      await db.delete(postReactionsTable).where(eq(postReactionsTable.id, existing.id));
      await db.update(postsTable)
        .set({ likesCount: sql`GREATEST(${postsTable.likesCount} - 1, 0)` })
        .where(eq(postsTable.id, postId));
      res.json({ action: "removed", reactionType: null });
    } else {
      await db.update(postReactionsTable)
        .set({ reactionType })
        .where(eq(postReactionsTable.id, existing.id));
      res.json({ action: "changed", reactionType });
    }
  } else {
    await db.insert(postReactionsTable).values({ postId, profileId: pid, reactionType });
    await db.update(postsTable)
      .set({ likesCount: sql`${postsTable.likesCount} + 1` })
      .where(eq(postsTable.id, postId));
    res.json({ action: "added", reactionType });
  }
});

// ── GET /posts/:id/comments ──────────────────────────────────────────────────
router.get("/posts/:id/comments", async (req, res): Promise<void> => {
  const postId = Number(req.params.id);
  if (isNaN(postId)) { res.status(400).json({ error: "Invalid id" }); return; }

  const comments = await db
    .select({
      id: postCommentsTable.id,
      content: postCommentsTable.content,
      createdAt: postCommentsTable.createdAt,
      profileId: profilesTable.id,
      profileName: profilesTable.name,
      profileHeadline: profilesTable.headline,
      profileAvatarUrl: profilesTable.avatarUrl,
    })
    .from(postCommentsTable)
    .innerJoin(profilesTable, eq(postCommentsTable.profileId, profilesTable.id))
    .where(eq(postCommentsTable.postId, postId))
    .orderBy(postCommentsTable.createdAt);

  res.json(comments);
});

// ── POST /posts/:id/comments ─────────────────────────────────────────────────
router.post("/posts/:id/comments", async (req, res): Promise<void> => {
  const postId = Number(req.params.id);
  if (isNaN(postId)) { res.status(400).json({ error: "Invalid id" }); return; }

  const { profileId, content } = req.body;
  if (!profileId || !content || typeof content !== "string" || content.trim().length === 0) {
    res.status(400).json({ error: "profileId and content are required" });
    return;
  }

  const [comment] = await db
    .insert(postCommentsTable)
    .values({ postId, profileId: Number(profileId), content: content.trim() })
    .returning();

  // Increment commentsCount
  await db.update(postsTable)
    .set({ commentsCount: sql`${postsTable.commentsCount} + 1` })
    .where(eq(postsTable.id, postId));

  // Return with profile info
  const [enriched] = await db
    .select({
      id: postCommentsTable.id,
      content: postCommentsTable.content,
      createdAt: postCommentsTable.createdAt,
      profileId: profilesTable.id,
      profileName: profilesTable.name,
      profileHeadline: profilesTable.headline,
      profileAvatarUrl: profilesTable.avatarUrl,
    })
    .from(postCommentsTable)
    .innerJoin(profilesTable, eq(postCommentsTable.profileId, profilesTable.id))
    .where(eq(postCommentsTable.id, comment.id));

  res.status(201).json(enriched);
});

// ── DELETE /posts/:id/comments/:commentId ────────────────────────────────────
router.delete("/posts/:id/comments/:commentId", async (req, res): Promise<void> => {
  const postId = Number(req.params.id);
  const commentId = Number(req.params.commentId);
  if (isNaN(postId) || isNaN(commentId)) { res.status(400).json({ error: "Invalid id" }); return; }

  await db.delete(postCommentsTable).where(eq(postCommentsTable.id, commentId));

  // Decrement commentsCount
  await db.update(postsTable)
    .set({ commentsCount: sql`GREATEST(${postsTable.commentsCount} - 1, 0)` })
    .where(eq(postsTable.id, postId));

  res.json({ success: true });
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
