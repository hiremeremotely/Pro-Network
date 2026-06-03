import { Router } from "express";
import { db } from "@workspace/db";
import { notificationsTable, profilesTable } from "@workspace/db";
import { desc, eq, and } from "drizzle-orm";

const router = Router();

// ── GET /notifications ────────────────────────────────────────────────────────
router.get("/notifications", async (req, res): Promise<void> => {
  const profileId = req.session.profileId!;

  const rows = await db
    .select({
      id: notificationsTable.id,
      type: notificationsTable.type,
      postId: notificationsTable.postId,
      conversationId: notificationsTable.conversationId,
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

// ── GET /notifications/unread-count ──────────────────────────────────────────
router.get("/notifications/unread-count", async (req, res): Promise<void> => {
  const profileId = req.session.profileId;
  if (!profileId) { res.json({ count: 0 }); return; }

  const rows = await db
    .select({ id: notificationsTable.id })
    .from(notificationsTable)
    .where(and(eq(notificationsTable.recipientProfileId, profileId), eq(notificationsTable.isRead, false)));

  res.json({ count: rows.length });
});

// ── PATCH /notifications/:id/mark-read ───────────────────────────────────────
router.patch("/notifications/:id/mark-read", async (req, res): Promise<void> => {
  const id = Number(req.params.id);
  if (!id || isNaN(id)) { res.status(400).json({ error: "id required" }); return; }
  await db.update(notificationsTable).set({ isRead: true }).where(eq(notificationsTable.id, id));
  res.json({ success: true });
});

// ── PATCH /notifications/mark-read ───────────────────────────────────────────
router.patch("/notifications/mark-read", async (req, res): Promise<void> => {
  const profileId = req.session.profileId!;

  await db
    .update(notificationsTable)
    .set({ isRead: true })
    .where(and(
      eq(notificationsTable.recipientProfileId, profileId),
      eq(notificationsTable.isRead, false),
    ));

  res.json({ success: true });
});

export default router;
