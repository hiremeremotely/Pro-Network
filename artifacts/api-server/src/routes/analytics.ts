import { Router } from "express";
import { db, postsTable, postReactionsTable, postCommentsTable, connectionsTable } from "@workspace/db";
import { eq, and, gte, desc, sql, count, inArray } from "drizzle-orm";

const router = Router();

const REACTION_LABELS: Record<string, string> = {
  like: "Like",
  celebrate: "Celebrate",
  support: "Support",
  love: "Love",
  insightful: "Insightful",
  funny: "Funny",
};

const REACTION_EMOJIS: Record<string, string> = {
  like: "👍",
  celebrate: "🎉",
  support: "🤝",
  love: "❤️",
  insightful: "💡",
  funny: "😄",
};

router.get("/analytics", async (req, res): Promise<void> => {
  const profileId = Number(req.query.profileId);
  if (!profileId) { res.status(400).json({ error: "profileId required" }); return; }

  const now = new Date();
  const day30 = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
  const day7  = new Date(now.getTime() -  7 * 24 * 60 * 60 * 1000);

  // ── All posts by this profile ──────────────────────────────────────────────
  const posts = await db
    .select({ id: postsTable.id, content: postsTable.content, likesCount: postsTable.likesCount, commentsCount: postsTable.commentsCount, createdAt: postsTable.createdAt })
    .from(postsTable)
    .where(eq(postsTable.profileId, profileId))
    .orderBy(desc(postsTable.createdAt));

  const postIds = posts.map(p => p.id);
  const totalPosts = posts.length;

  // ── Reactions received ─────────────────────────────────────────────────────
  const reactionRows = postIds.length > 0
    ? await db
        .select({ reactionType: postReactionsTable.reactionType, cnt: sql<number>`count(*)::int` })
        .from(postReactionsTable)
        .where(inArray(postReactionsTable.postId, postIds))
        .groupBy(postReactionsTable.reactionType)
    : [];

  const totalReactions = reactionRows.reduce((s, r) => s + r.cnt, 0);
  const reactionBreakdown = reactionRows
    .sort((a, b) => b.cnt - a.cnt)
    .map(r => ({
      type: r.reactionType,
      label: REACTION_LABELS[r.reactionType] ?? r.reactionType,
      emoji: REACTION_EMOJIS[r.reactionType] ?? "👍",
      count: r.cnt,
      pct: totalReactions > 0 ? Math.round((r.cnt / totalReactions) * 100) : 0,
    }));

  // ── Comments received ──────────────────────────────────────────────────────
  const commentResult = postIds.length > 0
    ? await db
        .select({ cnt: sql<number>`count(*)::int` })
        .from(postCommentsTable)
        .where(inArray(postCommentsTable.postId, postIds))
    : [{ cnt: 0 }];
  const totalComments = Number(commentResult[0]?.cnt ?? 0);

  // ── Followers ─────────────────────────────────────────────────────────────
  const followerResult = await db
    .select({ cnt: sql<number>`count(*)::int` })
    .from(connectionsTable)
    .where(eq(connectionsTable.followingId, profileId));
  const totalFollowers = Number(followerResult[0]?.cnt ?? 0);

  // ── Following ─────────────────────────────────────────────────────────────
  const followingResult = await db
    .select({ cnt: sql<number>`count(*)::int` })
    .from(connectionsTable)
    .where(eq(connectionsTable.followerId, profileId));
  const totalFollowing = Number(followingResult[0]?.cnt ?? 0);

  // ── Top posts by engagement ────────────────────────────────────────────────
  const topPosts = posts
    .map(p => ({ ...p, engagement: p.likesCount + p.commentsCount }))
    .sort((a, b) => b.engagement - a.engagement)
    .slice(0, 5)
    .map(p => ({
      id: p.id,
      snippet: p.content.slice(0, 120) + (p.content.length > 120 ? "…" : ""),
      reactions: p.likesCount,
      comments: p.commentsCount,
      engagement: p.engagement,
      createdAt: p.createdAt,
    }));

  // ── Weekly post activity — last 8 weeks ───────────────────────────────────
  const weeks: { label: string; count: number }[] = [];
  for (let i = 7; i >= 0; i--) {
    const start = new Date(now.getTime() - (i + 1) * 7 * 24 * 60 * 60 * 1000);
    const end   = new Date(now.getTime() - i       * 7 * 24 * 60 * 60 * 1000);
    const inRange = posts.filter(p => {
      const d = new Date(p.createdAt);
      return d >= start && d < end;
    }).length;
    const label = `W${8 - i}`;
    weeks.push({ label, count: inRange });
  }

  // ── Recent activity (last 30 days) ────────────────────────────────────────
  const postsLast30 = posts.filter(p => new Date(p.createdAt) >= day30).length;
  const postsLast7  = posts.filter(p => new Date(p.createdAt) >= day7).length;

  // ── Simulated profile views (deterministic seed) ─────────────────────────
  const seed = profileId;
  const profileViews90 = ((seed * 19 + 47) % 251) + 50;
  const profileViews30 = Math.round(profileViews90 * 0.38);
  const profileViews7  = Math.round(profileViews30 * 0.27);
  const viewsTrend     = ((seed * 7 + 11) % 30) + 5;

  // ── Simulated impressions ─────────────────────────────────────────────────
  const impressions7  = (((seed * 113 + 283) % 1800) + 400);
  const impressions30 = impressions7 * 4 + ((seed * 31) % 500);
  const impressionsTrend = ((seed * 3 + 7) % 20) + 2;

  res.json({
    totalPosts,
    totalReactions,
    totalComments,
    totalFollowers,
    totalFollowing,
    postsLast30,
    postsLast7,
    reactionBreakdown,
    topPosts,
    weeklyActivity: weeks,
    profileViews: { last7: profileViews7, last30: profileViews30, last90: profileViews90, trend: viewsTrend },
    impressions: { last7: impressions7, last30: impressions30, trend: impressionsTrend },
  });
});

export default router;
