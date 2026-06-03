import { Router } from "express";
import { db, bookmarksTable, jobsTable, postsTable, profilesTable, postReactionsTable, postCommentsTable } from "@workspace/db";
import { eq, and, inArray, desc, sql } from "drizzle-orm";

const router = Router();

router.get("/bookmarks", async (req, res): Promise<void> => {
  const profileId = req.session.profileId!;

  const bookmarks = await db.select().from(bookmarksTable).where(eq(bookmarksTable.profileId, profileId));

  const jobIds = bookmarks.filter(b => b.itemType === "job").map(b => b.itemId);
  const postIds = bookmarks.filter(b => b.itemType === "post").map(b => b.itemId);

  const [jobs, posts] = await Promise.all([
    jobIds.length > 0
      ? db.select().from(jobsTable).where(inArray(jobsTable.id, jobIds))
      : Promise.resolve([]),
    postIds.length > 0
      ? db.select({
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
        .where(inArray(postsTable.id, postIds))
        .orderBy(desc(postsTable.createdAt))
      : Promise.resolve([]),
  ]);

  res.json({ jobs, posts });
});

router.get("/bookmarks/ids", async (req, res): Promise<void> => {
  const profileId = req.session.profileId!;

  const bookmarks = await db.select().from(bookmarksTable).where(eq(bookmarksTable.profileId, profileId));
  res.json({
    jobIds: bookmarks.filter(b => b.itemType === "job").map(b => b.itemId),
    postIds: bookmarks.filter(b => b.itemType === "post").map(b => b.itemId),
  });
});

router.post("/bookmarks", async (req, res): Promise<void> => {
  const profileId = req.session.profileId!;
  const { itemType, itemId } = req.body;
  if (!itemType || !itemId) { res.status(400).json({ error: "itemType and itemId required" }); return; }

  try {
    await db.insert(bookmarksTable).values({ profileId, itemType, itemId: Number(itemId) }).onConflictDoNothing();
    res.json({ ok: true });
  } catch {
    res.status(500).json({ error: "Failed to bookmark" });
  }
});

router.delete("/bookmarks", async (req, res): Promise<void> => {
  const profileId = req.session.profileId!;
  const { itemType, itemId } = req.body;
  if (!itemType || !itemId) { res.status(400).json({ error: "itemType and itemId required" }); return; }

  await db.delete(bookmarksTable).where(
    and(
      eq(bookmarksTable.profileId, profileId),
      eq(bookmarksTable.itemType, itemType),
      eq(bookmarksTable.itemId, Number(itemId))
    )
  );
  res.json({ ok: true });
});

export default router;
