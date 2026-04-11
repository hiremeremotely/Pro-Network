import { Router } from "express";
import { db } from "@workspace/db";
import { conversationsTable, messagesTable, profilesTable, connectionsTable } from "@workspace/db";
import { desc, eq, sql, and, or, count } from "drizzle-orm";

const router = Router();

// ── Helper: ensure participant1_id < participant2_id ─────────────────────────
function orderedPair(a: number, b: number): [number, number] {
  return a < b ? [a, b] : [b, a];
}

// ── Helper: check if two users are connected (either direction) ───────────────
async function areConnected(a: number, b: number): Promise<boolean> {
  const rows = await db
    .select({ id: connectionsTable.id })
    .from(connectionsTable)
    .where(
      or(
        and(eq(connectionsTable.followerId, a), eq(connectionsTable.followingId, b)),
        and(eq(connectionsTable.followerId, b), eq(connectionsTable.followingId, a)),
      )
    )
    .limit(1);
  return rows.length > 0;
}

// ── POST /conversations ───────────────────────────────────────────────────────
// Create or retrieve a conversation between two users
router.post("/conversations", async (req, res): Promise<void> => {
  const { myProfileId, otherProfileId } = req.body;
  if (!myProfileId || !otherProfileId) {
    res.status(400).json({ error: "myProfileId and otherProfileId required" });
    return;
  }
  const [p1, p2] = orderedPair(Number(myProfileId), Number(otherProfileId));

  // Try to find existing conversation
  const [existing] = await db
    .select()
    .from(conversationsTable)
    .where(and(eq(conversationsTable.participant1Id, p1), eq(conversationsTable.participant2Id, p2)))
    .limit(1);

  if (existing) {
    res.json(existing);
    return;
  }

  const [created] = await db
    .insert(conversationsTable)
    .values({ participant1Id: p1, participant2Id: p2 })
    .returning();

  res.status(201).json(created);
});

// ── GET /conversations/unread-count ──────────────────────────────────────────
router.get("/conversations/unread-count", async (req, res): Promise<void> => {
  const profileId = Number(req.query.profileId);
  if (!profileId || isNaN(profileId)) { res.json({ count: 0 }); return; }

  // Find all conversation IDs where this user participates
  const myConvos = await db
    .select({ id: conversationsTable.id })
    .from(conversationsTable)
    .where(or(
      eq(conversationsTable.participant1Id, profileId),
      eq(conversationsTable.participant2Id, profileId),
    ));

  if (myConvos.length === 0) { res.json({ count: 0 }); return; }

  const convIds = myConvos.map(c => c.id);

  const unreadRows = await db
    .select({ id: messagesTable.id })
    .from(messagesTable)
    .where(
      sql`${messagesTable.conversationId} = ANY(${sql.raw(`ARRAY[${convIds.join(",")}]::int[]`)})
        AND ${messagesTable.senderProfileId} != ${profileId}
        AND ${messagesTable.isRead} = false`
    );

  res.json({ count: unreadRows.length });
});

// ── GET /conversations ────────────────────────────────────────────────────────
router.get("/conversations", async (req, res): Promise<void> => {
  const profileId = Number(req.query.profileId);
  if (!profileId || isNaN(profileId)) { res.status(400).json({ error: "profileId required" }); return; }

  const convos = await db
    .select()
    .from(conversationsTable)
    .where(or(
      eq(conversationsTable.participant1Id, profileId),
      eq(conversationsTable.participant2Id, profileId),
    ))
    .orderBy(desc(conversationsTable.lastMessageAt));

  if (convos.length === 0) { res.json([]); return; }

  // Enrich with other participant's profile
  const enriched = await Promise.all(convos.map(async c => {
    const otherProfileId = c.participant1Id === profileId ? c.participant2Id : c.participant1Id;
    const [other] = await db
      .select({ id: profilesTable.id, name: profilesTable.name, avatarUrl: profilesTable.avatarUrl, headline: profilesTable.headline })
      .from(profilesTable)
      .where(eq(profilesTable.id, otherProfileId))
      .limit(1);

    // Unread count
    const unread = await db
      .select({ id: messagesTable.id })
      .from(messagesTable)
      .where(
        sql`${messagesTable.conversationId} = ${c.id}
          AND ${messagesTable.senderProfileId} != ${profileId}
          AND ${messagesTable.isRead} = false`
      );

    const connected = await areConnected(profileId, otherProfileId);
    return { ...c, otherParticipant: other ?? null, unreadCount: unread.length, isConnected: connected };
  }));

  res.json(enriched);
});

// ── GET /conversations/:id/messages ─────────────────────────────────────────
router.get("/conversations/:id/messages", async (req, res): Promise<void> => {
  const convId = Number(req.params.id);
  if (isNaN(convId)) { res.status(400).json({ error: "Invalid id" }); return; }

  const msgs = await db
    .select({
      id: messagesTable.id,
      content: messagesTable.content,
      isRead: messagesTable.isRead,
      createdAt: messagesTable.createdAt,
      senderProfileId: messagesTable.senderProfileId,
      senderName: profilesTable.name,
      senderAvatarUrl: profilesTable.avatarUrl,
    })
    .from(messagesTable)
    .innerJoin(profilesTable, eq(messagesTable.senderProfileId, profilesTable.id))
    .where(eq(messagesTable.conversationId, convId))
    .orderBy(messagesTable.createdAt)
    .limit(100);

  res.json(msgs);
});

// ── POST /conversations/:id/messages ─────────────────────────────────────────
router.post("/conversations/:id/messages", async (req, res): Promise<void> => {
  const convId = Number(req.params.id);
  if (isNaN(convId)) { res.status(400).json({ error: "Invalid id" }); return; }

  const { senderProfileId, content } = req.body;
  if (!senderProfileId || !content || typeof content !== "string" || content.trim().length === 0) {
    res.status(400).json({ error: "senderProfileId and content required" });
    return;
  }

  // ── Enforce connection-based messaging rule ───────────────────────────────
  const [conv] = await db
    .select()
    .from(conversationsTable)
    .where(eq(conversationsTable.id, convId))
    .limit(1);

  if (!conv) { res.status(404).json({ error: "Conversation not found" }); return; }

  const otherProfileId = conv.participant1Id === Number(senderProfileId)
    ? conv.participant2Id
    : conv.participant1Id;

  const connected = await areConnected(Number(senderProfileId), otherProfileId);

  if (!connected) {
    // Count how many messages this sender has already sent in this conversation
    const [{ senderMsgCount }] = await db
      .select({ senderMsgCount: count() })
      .from(messagesTable)
      .where(and(
        eq(messagesTable.conversationId, convId),
        eq(messagesTable.senderProfileId, Number(senderProfileId)),
      ));

    if (senderMsgCount >= 1) {
      res.status(403).json({ error: "not_connected", message: "Connect with this person to continue the conversation." });
      return;
    }
  }
  // ─────────────────────────────────────────────────────────────────────────

  const [msg] = await db
    .insert(messagesTable)
    .values({ conversationId: convId, senderProfileId: Number(senderProfileId), content: content.trim() })
    .returning();

  // Update conversation preview
  await db
    .update(conversationsTable)
    .set({ lastMessageAt: new Date(), lastMessagePreview: content.trim().slice(0, 80) })
    .where(eq(conversationsTable.id, convId));

  // Return enriched
  const [enriched] = await db
    .select({
      id: messagesTable.id,
      content: messagesTable.content,
      isRead: messagesTable.isRead,
      createdAt: messagesTable.createdAt,
      senderProfileId: messagesTable.senderProfileId,
      senderName: profilesTable.name,
      senderAvatarUrl: profilesTable.avatarUrl,
    })
    .from(messagesTable)
    .innerJoin(profilesTable, eq(messagesTable.senderProfileId, profilesTable.id))
    .where(eq(messagesTable.id, msg.id));

  res.status(201).json(enriched);
});

// ── PATCH /conversations/:id/read ─────────────────────────────────────────────
router.patch("/conversations/:id/read", async (req, res): Promise<void> => {
  const convId = Number(req.params.id);
  const profileId = Number(req.body.profileId ?? req.query.profileId);
  if (isNaN(convId) || !profileId) { res.status(400).json({ error: "Invalid params" }); return; }

  await db
    .update(messagesTable)
    .set({ isRead: true })
    .where(
      sql`${messagesTable.conversationId} = ${convId}
        AND ${messagesTable.senderProfileId} != ${profileId}
        AND ${messagesTable.isRead} = false`
    );

  res.json({ success: true });
});

export default router;
