import { Router } from "express";
import { db } from "@workspace/db";
import { postsTable, postReactionsTable, postCommentsTable, profilesTable, notificationsTable } from "@workspace/db";
import { desc, eq, sql, inArray, notInArray, or, and } from "drizzle-orm";
import { connectionsTable } from "@workspace/db";

const REACTION_LABELS: Record<string, string> = {
  like: "liked",
  celebrate: "celebrated",
  support: "supported",
  love: "loved",
  insightful: "found insightful",
  funny: "found funny",
};

const router = Router();

// ── GET /posts ─────────────────────────────────────────────────────────────
router.get("/posts", async (req, res): Promise<void> => {
  const myProfileId = req.session.profileId ?? null;
  const authorProfileId = req.query.authorProfileId ? Number(req.query.authorProfileId) : null;

  const posts = await db
    .select({
      id: postsTable.id,
      content: postsTable.content,
      imageUrl: postsTable.imageUrl,
      visibility: postsTable.visibility,
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
    .where(authorProfileId ? eq(postsTable.profileId, authorProfileId) : undefined)
    .orderBy(desc(postsTable.createdAt))
    .limit(authorProfileId ? 20 : 50);

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

// ── GET /posts/feed — personalized ranked feed with recommendations ────────────
router.get("/posts/feed", async (req, res): Promise<void> => {
  const viewerId = req.query.viewerId ? Number(req.query.viewerId) : null;
  const sort = (req.query.sort as string) || "recent"; // "top" | "recent"

  const postFields = {
    id: postsTable.id,
    content: postsTable.content,
    imageUrl: postsTable.imageUrl,
    visibility: postsTable.visibility,
    likesCount: postsTable.likesCount,
    commentsCount: postsTable.commentsCount,
    createdAt: postsTable.createdAt,
    profileId: profilesTable.id,
    profileName: profilesTable.name,
    profileHeadline: profilesTable.headline,
    profileAvatarUrl: profilesTable.avatarUrl,
    profileAccountType: profilesTable.accountType,
  };

  // Gather network author IDs: viewer + all accepted connections/follows
  let authorIds: number[] = [];
  if (viewerId) {
    const conns = await db
      .select({ followerId: connectionsTable.followerId, followingId: connectionsTable.followingId })
      .from(connectionsTable)
      .where(
        and(
          or(eq(connectionsTable.followerId, viewerId), eq(connectionsTable.followingId, viewerId)),
          eq(connectionsTable.status, "accepted")
        )
      );
    const connectedIds = conns.map(c => (c.followerId === viewerId ? c.followingId : c.followerId));
    authorIds = Array.from(new Set([viewerId, ...connectedIds]));
  }

  // 1. Network posts (self + connections/followed companies)
  const networkPosts = authorIds.length > 0
    ? await db
        .select(postFields)
        .from(postsTable)
        .innerJoin(profilesTable, eq(postsTable.profileId, profilesTable.id))
        .where(inArray(postsTable.profileId, authorIds))
        .orderBy(desc(postsTable.createdAt))
        .limit(80)
    : [];

  // 2. Recommended posts: outside the network, public only, ordered by engagement
  const excludeIds = authorIds.length > 0 ? authorIds : viewerId ? [viewerId] : [];
  const recommendedPosts = await db
    .select(postFields)
    .from(postsTable)
    .innerJoin(profilesTable, eq(postsTable.profileId, profilesTable.id))
    .where(and(
      excludeIds.length > 0 ? notInArray(postsTable.profileId, excludeIds) : undefined,
      eq(postsTable.visibility, "public"),
    ))
    .orderBy(desc(sql`${postsTable.likesCount} + ${postsTable.commentsCount} * 2`), desc(postsTable.createdAt))
    .limit(25);

  const allPosts = [
    ...networkPosts.map(p => ({ ...p, isRecommended: false as const })),
    ...recommendedPosts.map(p => ({ ...p, isRecommended: true as const })),
  ];

  if (allPosts.length === 0) { res.json({ posts: [], empty: true }); return; }

  const postIds = allPosts.map(p => p.id);

  // Reaction counts
  const reactionRows = await db
    .select({ postId: postReactionsTable.postId, reactionType: postReactionsTable.reactionType, count: sql<number>`count(*)::int` })
    .from(postReactionsTable)
    .where(inArray(postReactionsTable.postId, postIds))
    .groupBy(postReactionsTable.postId, postReactionsTable.reactionType);

  // My reactions
  const myReactions: Record<number, string> = {};
  if (viewerId && postIds.length > 0) {
    const myRows = await db
      .select({ postId: postReactionsTable.postId, reactionType: postReactionsTable.reactionType })
      .from(postReactionsTable)
      .where(sql`${postReactionsTable.postId} = ANY(${sql.raw(`ARRAY[${postIds.join(",")}]::int[]`)}) AND ${postReactionsTable.profileId} = ${viewerId}`);
    myRows.forEach(r => { myReactions[r.postId] = r.reactionType; });
  }

  const reactionCounts: Record<number, Record<string, number>> = {};
  postIds.forEach(id => { reactionCounts[id] = {}; });
  reactionRows.forEach(r => { reactionCounts[r.postId][r.reactionType] = r.count; });

  function rankScore(p: (typeof allPosts)[0], isRecommended: boolean) {
    const totalReactions = Object.values(reactionCounts[p.id] ?? {}).reduce((a, b) => a + b, 0);
    const engagement = totalReactions + p.commentsCount * 2;
    const hoursElapsed = (Date.now() - new Date(p.createdAt).getTime()) / 3_600_000;
    const base = engagement / Math.pow(hoursElapsed + 2, 1.5);
    // Network posts get a 1.5× boost in "top" ranking
    return isRecommended ? base : base * 1.5;
  }

  const enrichedNetwork = networkPosts.map(p => ({
    ...p,
    reactionCounts: reactionCounts[p.id] ?? {},
    myReaction: myReactions[p.id] ?? null,
    isOwn: p.profileId === viewerId,
    isConnection: viewerId ? authorIds.includes(p.profileId) && p.profileId !== viewerId : false,
    isRecommended: false,
  }));

  const enrichedRecommended = recommendedPosts.map(p => ({
    ...p,
    reactionCounts: reactionCounts[p.id] ?? {},
    myReaction: myReactions[p.id] ?? null,
    isOwn: false,
    isConnection: false,
    isRecommended: true,
  }));

  if (sort === "top") {
    // Mix and rank everything, network posts get a score boost
    const all = [
      ...enrichedNetwork.map(p => ({ ...p, _score: rankScore(p, false) })),
      ...enrichedRecommended.map(p => ({ ...p, _score: rankScore(p, true) })),
    ];
    all.sort((a, b) => b._score - a._score);
    res.json({ posts: all.slice(0, 60), empty: false });
    return;
  }

  // "recent" mode: interleave 1 recommended post every 4 network posts
  const result: typeof enrichedNetwork = [];
  let ri = 0;
  for (let i = 0; i < enrichedNetwork.length; i++) {
    result.push(enrichedNetwork[i]);
    if ((i + 1) % 4 === 0 && ri < enrichedRecommended.length) {
      result.push(enrichedRecommended[ri++] as typeof enrichedNetwork[0]);
    }
  }
  // Append any remaining recommended posts at the end
  while (ri < enrichedRecommended.length) {
    result.push(enrichedRecommended[ri++] as typeof enrichedNetwork[0]);
  }

  res.json({ posts: result.slice(0, 60), empty: false });
});

// ── POST /posts ─────────────────────────────────────────────────────────────
router.post("/posts", async (req, res): Promise<void> => {
  const profileId = req.session.profileId!;
  const { content, imageUrl, visibility } = req.body;
  if (!content || typeof content !== "string" || content.trim().length === 0) {
    res.status(400).json({ error: "content is required" });
    return;
  }
  // Validate visibility; companies always get "public"
  const [profile] = await db.select({ accountType: profilesTable.accountType }).from(profilesTable).where(eq(profilesTable.id, profileId)).limit(1);
  const resolvedVisibility = profile?.accountType === "company" ? "public" : (visibility === "connections" ? "connections" : "public");

  const [post] = await db
    .insert(postsTable)
    .values({ profileId, content: content.trim(), imageUrl: imageUrl ?? null, visibility: resolvedVisibility })
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

  const { reactionType } = req.body;
  if (!reactionType) {
    res.status(400).json({ error: "reactionType is required" });
    return;
  }

  const pid = req.session.profileId!;
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
      // Notify on reaction change
      const [post] = await db.select({ profileId: postsTable.profileId }).from(postsTable).where(eq(postsTable.id, postId)).limit(1);
      if (post && post.profileId !== pid) {
        const [actor] = await db.select({ name: profilesTable.name }).from(profilesTable).where(eq(profilesTable.id, pid)).limit(1);
        const label = REACTION_LABELS[reactionType] ?? reactionType;
        await db.insert(notificationsTable).values({
          recipientProfileId: post.profileId, actorProfileId: pid,
          type: "reaction", postId, reactionType,
          message: `${actor?.name ?? "Someone"} ${label} your post`,
        });
      }
      res.json({ action: "changed", reactionType });
    }
  } else {
    await db.insert(postReactionsTable).values({ postId, profileId: pid, reactionType });
    await db.update(postsTable)
      .set({ likesCount: sql`${postsTable.likesCount} + 1` })
      .where(eq(postsTable.id, postId));
    // Notify on new reaction
    const [post] = await db.select({ profileId: postsTable.profileId }).from(postsTable).where(eq(postsTable.id, postId)).limit(1);
    if (post && post.profileId !== pid) {
      const [actor] = await db.select({ name: profilesTable.name }).from(profilesTable).where(eq(profilesTable.id, pid)).limit(1);
      const label = REACTION_LABELS[reactionType] ?? reactionType;
      await db.insert(notificationsTable).values({
        recipientProfileId: post.profileId, actorProfileId: pid,
        type: "reaction", postId, reactionType,
        message: `${actor?.name ?? "Someone"} ${label} your post`,
      });
    }
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

  const profileId = req.session.profileId!;
  const { content } = req.body;
  if (!content || typeof content !== "string" || content.trim().length === 0) {
    res.status(400).json({ error: "content is required" });
    return;
  }

  const [comment] = await db
    .insert(postCommentsTable)
    .values({ postId, profileId, content: content.trim() })
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

  // Notify post owner about new comment (skip self-comments)
  const [post] = await db.select({ profileId: postsTable.profileId }).from(postsTable).where(eq(postsTable.id, postId)).limit(1);
  if (post && post.profileId !== Number(profileId)) {
    await db.insert(notificationsTable).values({
      recipientProfileId: post.profileId,
      actorProfileId: Number(profileId),
      type: "comment",
      postId,
      message: `${enriched?.profileName ?? "Someone"} commented on your post`,
    });
  }

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
