import { Router } from "express";
import { db } from "@workspace/db";
import { conversationsTable, conversationMembersTable, messagesTable, profilesTable, connectionsTable } from "@workspace/db";
import { desc, eq, sql, and, or, count, inArray } from "drizzle-orm";

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

// ── GET /messaging/team-channel ───────────────────────────────────────────────
// Returns (or creates) the team channel for a given company.
// Query: ?companyProfileId=
router.get("/messaging/team-channel", async (req, res): Promise<void> => {
  const companyProfileId = parseInt(req.query.companyProfileId as string);
  if (isNaN(companyProfileId)) {
    res.status(400).json({ error: "companyProfileId required" });
    return;
  }

  // Try to find existing team channel
  const [existing] = await db
    .select()
    .from(conversationsTable)
    .where(and(eq(conversationsTable.companyProfileId, companyProfileId), eq(conversationsTable.type, "team")))
    .limit(1);

  if (existing) {
    res.json(existing);
    return;
  }

  // Create the team channel — use companyProfileId for both participant cols (sentinel)
  const [created] = await db
    .insert(conversationsTable)
    .values({
      participant1Id: companyProfileId,
      participant2Id: companyProfileId,
      type: "team",
      companyProfileId,
    })
    .returning();

  // Auto-add the company itself as a member
  await db
    .insert(conversationMembersTable)
    .values({ conversationId: created.id, profileId: companyProfileId })
    .onConflictDoNothing();

  res.status(201).json(created);
});

// ── POST /messaging/team-channel/members ─────────────────────────────────────
// Add a member to the team channel for a company.
// Body: { companyProfileId, memberProfileId }
router.post("/messaging/team-channel/members", async (req, res): Promise<void> => {
  const { companyProfileId, memberProfileId } = req.body;
  if (!companyProfileId || !memberProfileId) {
    res.status(400).json({ error: "companyProfileId and memberProfileId required" });
    return;
  }

  // Get or create the team channel
  let channel = await db
    .select()
    .from(conversationsTable)
    .where(and(eq(conversationsTable.companyProfileId, Number(companyProfileId)), eq(conversationsTable.type, "team")))
    .limit(1)
    .then(r => r[0]);

  if (!channel) {
    const [created] = await db
      .insert(conversationsTable)
      .values({
        participant1Id: Number(companyProfileId),
        participant2Id: Number(companyProfileId),
        type: "team",
        companyProfileId: Number(companyProfileId),
      })
      .returning();
    channel = created;
    // Add company as member
    await db
      .insert(conversationMembersTable)
      .values({ conversationId: channel.id, profileId: Number(companyProfileId) })
      .onConflictDoNothing();
  }

  // Add new member
  await db
    .insert(conversationMembersTable)
    .values({ conversationId: channel.id, profileId: Number(memberProfileId) })
    .onConflictDoNothing();

  res.json({ conversationId: channel.id, memberProfileId });
});

// ── DELETE /messaging/team-channel/members ────────────────────────────────────
// Remove a member from the team channel.
// Body: { companyProfileId, memberProfileId }
router.delete("/messaging/team-channel/members", async (req, res): Promise<void> => {
  const companyProfileId = parseInt(req.query.companyProfileId as string);
  const memberProfileId = parseInt(req.query.memberProfileId as string);
  if (isNaN(companyProfileId) || isNaN(memberProfileId)) {
    res.status(400).json({ error: "companyProfileId and memberProfileId required" });
    return;
  }

  const [channel] = await db
    .select({ id: conversationsTable.id })
    .from(conversationsTable)
    .where(and(eq(conversationsTable.companyProfileId, companyProfileId), eq(conversationsTable.type, "team")))
    .limit(1);

  if (!channel) { res.status(404).json({ error: "Team channel not found" }); return; }

  await db
    .delete(conversationMembersTable)
    .where(and(eq(conversationMembersTable.conversationId, channel.id), eq(conversationMembersTable.profileId, memberProfileId)));

  res.status(204).end();
});

// ── POST /conversations ───────────────────────────────────────────────────────
// Create or retrieve a direct conversation between two users
router.post("/conversations", async (req, res): Promise<void> => {
  const { myProfileId, otherProfileId } = req.body;
  if (!myProfileId || !otherProfileId) {
    res.status(400).json({ error: "myProfileId and otherProfileId required" });
    return;
  }
  const [p1, p2] = orderedPair(Number(myProfileId), Number(otherProfileId));

  // Try to find existing direct conversation
  const [existing] = await db
    .select()
    .from(conversationsTable)
    .where(and(
      eq(conversationsTable.participant1Id, p1),
      eq(conversationsTable.participant2Id, p2),
      eq(conversationsTable.type, "direct")
    ))
    .limit(1);

  if (existing) {
    res.json(existing);
    return;
  }

  const [created] = await db
    .insert(conversationsTable)
    .values({ participant1Id: p1, participant2Id: p2, type: "direct" })
    .returning();

  res.status(201).json(created);
});

// ── GET /conversations/unread-count ──────────────────────────────────────────
router.get("/conversations/unread-count", async (req, res): Promise<void> => {
  const profileId = Number(req.query.profileId);
  if (!profileId || isNaN(profileId)) { res.json({ count: 0 }); return; }

  // Direct conversations
  const directConvos = await db
    .select({ id: conversationsTable.id })
    .from(conversationsTable)
    .where(and(
      or(
        eq(conversationsTable.participant1Id, profileId),
        eq(conversationsTable.participant2Id, profileId),
      ),
      eq(conversationsTable.type, "direct")
    ));

  // Team conversations (via membership)
  const memberConvos = await db
    .select({ conversationId: conversationMembersTable.conversationId })
    .from(conversationMembersTable)
    .where(eq(conversationMembersTable.profileId, profileId));

  const allConvIds = [
    ...directConvos.map(c => c.id),
    ...memberConvos.map(m => m.conversationId),
  ];

  if (allConvIds.length === 0) { res.json({ count: 0 }); return; }

  const unreadRows = await db
    .select({ id: messagesTable.id })
    .from(messagesTable)
    .where(
      sql`${messagesTable.conversationId} = ANY(${sql.raw(`ARRAY[${allConvIds.join(",")}]::int[]`)})
        AND ${messagesTable.senderProfileId} != ${profileId}
        AND ${messagesTable.isRead} = false`
    );

  res.json({ count: unreadRows.length });
});

// ── GET /conversations ────────────────────────────────────────────────────────
// Returns all conversations (direct + team channels) for a user, team channels first
router.get("/conversations", async (req, res): Promise<void> => {
  const profileId = Number(req.query.profileId);
  if (!profileId || isNaN(profileId)) { res.status(400).json({ error: "profileId required" }); return; }

  // 1. Direct conversations
  const directConvos = await db
    .select()
    .from(conversationsTable)
    .where(and(
      or(
        eq(conversationsTable.participant1Id, profileId),
        eq(conversationsTable.participant2Id, profileId),
      ),
      eq(conversationsTable.type, "direct")
    ))
    .orderBy(desc(conversationsTable.lastMessageAt));

  // 2. Team conversations (via membership)
  const memberRows = await db
    .select({ conversationId: conversationMembersTable.conversationId })
    .from(conversationMembersTable)
    .where(eq(conversationMembersTable.profileId, profileId));

  const teamConvIds = memberRows.map(m => m.conversationId);
  const teamConvos = teamConvIds.length
    ? await db
        .select()
        .from(conversationsTable)
        .where(and(inArray(conversationsTable.id, teamConvIds), eq(conversationsTable.type, "team")))
        .orderBy(desc(conversationsTable.lastMessageAt))
    : [];

  // Enrich direct convos
  const enrichedDirect = await Promise.all(directConvos.map(async c => {
    const otherProfileId = c.participant1Id === profileId ? c.participant2Id : c.participant1Id;
    const [other] = await db
      .select({ id: profilesTable.id, name: profilesTable.name, avatarUrl: profilesTable.avatarUrl, headline: profilesTable.headline })
      .from(profilesTable)
      .where(eq(profilesTable.id, otherProfileId))
      .limit(1);

    const unread = await db
      .select({ id: messagesTable.id })
      .from(messagesTable)
      .where(
        sql`${messagesTable.conversationId} = ${c.id}
          AND ${messagesTable.senderProfileId} != ${profileId}
          AND ${messagesTable.isRead} = false`
      );

    const connected = await areConnected(profileId, otherProfileId);
    return { ...c, otherParticipant: other ?? null, unreadCount: unread.length, isConnected: connected, conversationType: "direct" as const };
  }));

  // Enrich team convos
  const enrichedTeam = await Promise.all(teamConvos.map(async c => {
    // Team channel: "other participant" is the company
    const [company] = await db
      .select({ id: profilesTable.id, name: profilesTable.name, avatarUrl: profilesTable.avatarUrl, headline: profilesTable.headline })
      .from(profilesTable)
      .where(eq(profilesTable.id, c.companyProfileId!))
      .limit(1);

    const unread = await db
      .select({ id: messagesTable.id })
      .from(messagesTable)
      .where(
        sql`${messagesTable.conversationId} = ${c.id}
          AND ${messagesTable.senderProfileId} != ${profileId}
          AND ${messagesTable.isRead} = false`
      );

    return {
      ...c,
      otherParticipant: company ?? null,
      unreadCount: unread.length,
      isConnected: true,
      conversationType: "team" as const,
    };
  }));

  // Team channels first, then direct convos
  res.json([...enrichedTeam, ...enrichedDirect]);
});

// ── Helper: check that profileId is allowed to access a conversation ──────────
// Direct: must be participant1 or participant2
// Team: must be a member in conversation_members
async function canAccessConversation(convId: number, profileId: number): Promise<boolean> {
  const [conv] = await db.select().from(conversationsTable).where(eq(conversationsTable.id, convId)).limit(1);
  if (!conv) return false;
  if (conv.type === "team") {
    const [member] = await db
      .select({ id: conversationMembersTable.id })
      .from(conversationMembersTable)
      .where(and(eq(conversationMembersTable.conversationId, convId), eq(conversationMembersTable.profileId, profileId)))
      .limit(1);
    return !!member;
  }
  return conv.participant1Id === profileId || conv.participant2Id === profileId;
}

// ── GET /conversations/:id/messages ─────────────────────────────────────────
// Query: ?profileId= required to enforce access control
router.get("/conversations/:id/messages", async (req, res): Promise<void> => {
  const convId = Number(req.params.id);
  const profileId = Number(req.query.profileId);
  if (isNaN(convId)) { res.status(400).json({ error: "Invalid id" }); return; }
  if (!profileId || isNaN(profileId)) { res.status(400).json({ error: "profileId required" }); return; }

  // Authorization check
  const allowed = await canAccessConversation(convId, profileId);
  if (!allowed) { res.status(403).json({ error: "Access denied" }); return; }

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

  const [conv] = await db
    .select()
    .from(conversationsTable)
    .where(eq(conversationsTable.id, convId))
    .limit(1);

  if (!conv) { res.status(404).json({ error: "Conversation not found" }); return; }

  // Enforce sender authorization
  if (conv.type === "team") {
    // Team channel: sender must be a member
    const [member] = await db
      .select({ id: conversationMembersTable.id })
      .from(conversationMembersTable)
      .where(and(eq(conversationMembersTable.conversationId, convId), eq(conversationMembersTable.profileId, Number(senderProfileId))))
      .limit(1);
    if (!member) {
      res.status(403).json({ error: "Access denied: not a member of this team channel" });
      return;
    }
  } else {
    // Direct conversation: sender must be a participant
    const otherProfileId = conv.participant1Id === Number(senderProfileId)
      ? conv.participant2Id
      : conv.participant1Id;

    const connected = await areConnected(Number(senderProfileId), otherProfileId);

    if (!connected) {
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
  }

  const [msg] = await db
    .insert(messagesTable)
    .values({ conversationId: convId, senderProfileId: Number(senderProfileId), content: content.trim() })
    .returning();

  await db
    .update(conversationsTable)
    .set({ lastMessageAt: new Date(), lastMessagePreview: content.trim().slice(0, 80) })
    .where(eq(conversationsTable.id, convId));

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
