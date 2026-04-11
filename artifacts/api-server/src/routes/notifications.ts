import { Router } from "express";
import { db } from "@workspace/db";
import { notificationsTable, profilesTable } from "@workspace/db";
import { desc, eq, and } from "drizzle-orm";

const router = Router();

// ── GET /notifications?profileId=:id ─────────────────────────────────────────
router.get("/notifications", async (req, res): Promise<void> => {
  const profileId = Number(req.query.profileId);
  if (!profileId || isNaN(profileId)) {
    res.status(400).json({ error: "profileId required" });
    return;
  }

  const rows = await db
    .select({
      id: notificationsTable.id,
      type: notificationsTable.type,
      postId: notificationsTable.postId,
      reactionType: notificationsTable.reactionType,
      message: notificationsTable.message,
      isRead: notificationsTable.isRead,
      createdAt: notificationsTable.createdAt,
      actorProfileId: profilesTable.id,
      actorName: profilesTable.name,
      actorAvatarUrl: profilesTable.avatarUrl,
    })
    .from(notificationsTable)
    .innerJoin(profilesTable, eq(notificationsTable.actorProfileId, profilesTable.id))
    .where(eq(notificationsTable.recipientProfileId, profileId))
    .orderBy(desc(notificationsTable.createdAt))
    .limit(40);

  res.json(rows);
});

// ── GET /notifications/unread-count?profileId=:id ────────────────────────────
router.get("/notifications/unread-count", async (req, res): Promise<void> => {
  const profileId = Number(req.query.profileId);
  if (!profileId || isNaN(profileId)) {
    res.json({ count: 0 });
    return;
  }
  const rows = await db
    .select({ id: notificationsTable.id })
    .from(notificationsTable)
    .where(and(eq(notificationsTable.recipientProfileId, profileId), eq(notificationsTable.isRead, false)));

  res.json({ count: rows.length });
});

// ── PATCH /notifications/mark-read ───────────────────────────────────────────
router.patch("/notifications/mark-read", async (req, res): Promise<void> => {
  const { profileId } = req.body;
  if (!profileId) { res.status(400).json({ error: "profileId required" }); return; }

  await db
    .update(notificationsTable)
    .set({ isRead: true })
    .where(and(
      eq(notificationsTable.recipientProfileId, Number(profileId)),
      eq(notificationsTable.isRead, false),
    ));

  res.json({ success: true });
});

export default router;
