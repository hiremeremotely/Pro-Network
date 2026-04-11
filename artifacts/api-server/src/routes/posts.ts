import { Router } from "express";
import { db } from "@workspace/db";
import { postsTable, profilesTable } from "@workspace/db";
import { desc, eq, sql } from "drizzle-orm";

const router = Router();

router.get("/posts", async (_req, res): Promise<void> => {
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
  res.json(posts);
});

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

router.delete("/posts/:id", async (req, res): Promise<void> => {
  const id = Number(req.params.id);
  if (isNaN(id)) { res.status(400).json({ error: "Invalid id" }); return; }
  await db.delete(postsTable).where(eq(postsTable.id, id));
  res.json({ success: true });
});

router.post("/posts/:id/like", async (req, res): Promise<void> => {
  const id = Number(req.params.id);
  if (isNaN(id)) { res.status(400).json({ error: "Invalid id" }); return; }
  await db
    .update(postsTable)
    .set({ likesCount: sql`${postsTable.likesCount} + 1` })
    .where(eq(postsTable.id, id));
  res.json({ success: true });
});

export default router;
