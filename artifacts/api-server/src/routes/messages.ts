import { Router } from "express";
import { db } from "@workspace/db";
import { messages, roomMembers, rooms, reports } from "@workspace/db";
import { eq, and, sql, lt, desc } from "drizzle-orm";
import { requireAuth } from "../lib/auth";

const router = Router();

// Rate limiting: max 10 messages per 20 seconds per user per room
const rateLimitMap = new Map<string, { count: number; resetAt: number }>();

function checkRateLimit(userId: string, roomId: string): boolean {
  const key = `${userId}:${roomId}`;
  const now = Date.now();
  const entry = rateLimitMap.get(key);

  if (!entry || entry.resetAt < now) {
    rateLimitMap.set(key, { count: 1, resetAt: now + 20000 });
    return true;
  }

  if (entry.count >= 10) return false;
  entry.count++;
  return true;
}

// Profanity filter (basic - extend as needed)
const BANNED_WORDS = ["fuck", "shit", "ass", "bitch", "nigger", "faggot"];
function filterProfanity(text: string): string {
  let filtered = text;
  for (const word of BANNED_WORDS) {
    const regex = new RegExp(word, "gi");
    filtered = filtered.replace(regex, "*".repeat(word.length));
  }
  return filtered;
}

// GET /rooms/:roomId/messages
router.get("/rooms/:roomId/messages", requireAuth, async (req, res) => {
  try {
    const { roomId } = req.params;
    const userId = req.user!.id;
    const { before, limit: limitStr = "30" } = req.query as {
      before?: string;
      limit?: string;
    };

    const limit = Math.min(parseInt(limitStr, 10) || 30, 50);

    // Verify membership
    const member = await db.query.roomMembers.findFirst({
      where: and(eq(roomMembers.roomId, roomId), eq(roomMembers.userId, userId)),
    });
    if (!member) {
      res.status(403).json({ error: "You must join this room to see messages" });
      return;
    }

    let whereClause = sql`m.room_id = ${roomId}`;
    if (before) {
      const beforeMsg = await db.query.messages.findFirst({
        where: eq(messages.id, before),
      });
      if (beforeMsg) {
        whereClause = sql`${whereClause} AND m.created_at < ${beforeMsg.createdAt}`;
      }
    }

    const result = await db.execute(sql`
      SELECT 
        m.id, m.room_id, m.sender_id, m.body, m.reply_to_id, 
        m.created_at, m.is_deleted,
        p.username AS sender_username,
        p.avatar_key AS sender_avatar_key,
        reply.body AS reply_to_body,
        reply_p.username AS reply_to_sender_username
      FROM messages m
      JOIN profiles p ON p.id = m.sender_id
      LEFT JOIN messages reply ON reply.id = m.reply_to_id
      LEFT JOIN profiles reply_p ON reply_p.id = reply.sender_id
      WHERE ${whereClause}
      ORDER BY m.created_at DESC
      LIMIT ${limit + 1}
    `);

    const rows = result.rows as any[];
    const hasMore = rows.length > limit;
    const pageRows = hasMore ? rows.slice(0, limit) : rows;

    res.json({
      messages: pageRows.reverse().map((m) => ({
        id: m.id,
        roomId: m.room_id,
        senderId: m.sender_id,
        senderUsername: m.sender_username,
        senderAvatarKey: m.sender_avatar_key,
        body: m.is_deleted ? "[message deleted]" : m.body,
        replyToId: m.reply_to_id ?? null,
        replyToBody: m.reply_to_body ?? null,
        replyToSenderUsername: m.reply_to_sender_username ?? null,
        createdAt: m.created_at,
        isDeleted: m.is_deleted,
      })),
      hasMore,
    });
  } catch (err) {
    req.log.error({ err }, "listMessages error");
    res.status(500).json({ error: "Internal server error" });
  }
});

// POST /rooms/:roomId/messages
router.post("/rooms/:roomId/messages", requireAuth, async (req, res) => {
  try {
    const { roomId } = req.params;
    const userId = req.user!.id;
    const { body, replyToId } = req.body as { body: string; replyToId?: string };

    if (!body || body.trim().length === 0) {
      res.status(400).json({ error: "Message body required" });
      return;
    }
    if (body.length > 2000) {
      res.status(400).json({ error: "Message too long (max 2000 chars)" });
      return;
    }

    // Rate limit check
    if (!checkRateLimit(userId, roomId)) {
      res.status(429).json({ error: "Too many messages. Please slow down." });
      return;
    }

    // Verify membership
    const member = await db.query.roomMembers.findFirst({
      where: and(eq(roomMembers.roomId, roomId), eq(roomMembers.userId, userId)),
    });
    if (!member) {
      res.status(403).json({ error: "You must join this room to send messages" });
      return;
    }

    const filteredBody = filterProfanity(body.trim());

    const [message] = await db
      .insert(messages)
      .values({
        roomId,
        senderId: userId,
        body: filteredBody,
        replyToId: replyToId || null,
      })
      .returning();

    if (!message) {
      res.status(500).json({ error: "Failed to send message" });
      return;
    }

    // Update room last_activity_at
    await db
      .update(rooms)
      .set({ lastActivityAt: new Date() })
      .where(eq(rooms.id, roomId));

    // Fetch full message with sender info
    const result = await db.execute(sql`
      SELECT 
        m.id, m.room_id, m.sender_id, m.body, m.reply_to_id,
        m.created_at, m.is_deleted,
        p.username AS sender_username,
        p.avatar_key AS sender_avatar_key,
        reply.body AS reply_to_body,
        reply_p.username AS reply_to_sender_username
      FROM messages m
      JOIN profiles p ON p.id = m.sender_id
      LEFT JOIN messages reply ON reply.id = m.reply_to_id
      LEFT JOIN profiles reply_p ON reply_p.id = reply.sender_id
      WHERE m.id = ${message.id}
    `);

    const m = result.rows[0] as any;
    const fullMessage = {
      id: m.id,
      roomId: m.room_id,
      senderId: m.sender_id,
      senderUsername: m.sender_username,
      senderAvatarKey: m.sender_avatar_key,
      body: m.body,
      replyToId: m.reply_to_id ?? null,
      replyToBody: m.reply_to_body ?? null,
      replyToSenderUsername: m.reply_to_sender_username ?? null,
      createdAt: m.created_at,
      isDeleted: false,
    };

    // Broadcast via Socket.io if available
    try {
      const { getIO } = await import("../socket.js");
      const io = getIO();
      if (io) {
        io.to(roomId).emit("new_message", fullMessage);
      }
    } catch {
      // socket may not be initialized
    }

    res.status(201).json(fullMessage);
  } catch (err) {
    req.log.error({ err }, "sendMessage error");
    res.status(500).json({ error: "Internal server error" });
  }
});

// DELETE /messages/:messageId
router.delete("/messages/:messageId", requireAuth, async (req, res) => {
  try {
    const { messageId } = req.params;
    const userId = req.user!.id;

    const message = await db.query.messages.findFirst({
      where: eq(messages.id, messageId),
    });
    if (!message) {
      res.status(404).json({ error: "Message not found" });
      return;
    }
    if (message.senderId !== userId) {
      res.status(403).json({ error: "You can only delete your own messages" });
      return;
    }

    await db
      .update(messages)
      .set({ isDeleted: true })
      .where(eq(messages.id, messageId));

    // Broadcast deletion via Socket.io
    try {
      const { getIO } = await import("../socket.js");
      const io = getIO();
      if (io) {
        io.to(message.roomId).emit("message_deleted", { messageId });
      }
    } catch {
      // socket may not be initialized
    }

    res.json({ success: true });
  } catch (err) {
    req.log.error({ err }, "deleteMessage error");
    res.status(500).json({ error: "Internal server error" });
  }
});

// POST /messages/:messageId/report
router.post("/messages/:messageId/report", requireAuth, async (req, res) => {
  try {
    const { messageId } = req.params;
    const userId = req.user!.id;
    const { reason, note } = req.body as { reason: string; note?: string };

    if (!reason) {
      res.status(400).json({ error: "reason required" });
      return;
    }

    const message = await db.query.messages.findFirst({
      where: eq(messages.id, messageId),
    });
    if (!message) {
      res.status(404).json({ error: "Message not found" });
      return;
    }

    await db.insert(reports).values({
      reporterId: userId,
      messageId,
      reason: reason as any,
      note: note || null,
    });

    res.status(201).json({ success: true });
  } catch (err) {
    req.log.error({ err }, "reportMessage error");
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
