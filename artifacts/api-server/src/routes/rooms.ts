import { Router } from "express";
import { db } from "@workspace/db";
import { rooms, roomMembers, messages, profiles } from "@workspace/db";
import { eq, and, sql, desc, ilike, count } from "drizzle-orm";
import { requireAuth } from "../lib/auth";
import type { RoomCategory } from "@workspace/api-zod";

const router = Router();

// Helper: get room with metadata for current user
async function getRoomWithMeta(roomId: string, userId: string) {
  const result = await db.execute(sql`
    SELECT 
      r.id, r.title, r.description, r.category, r.owner_id, 
      r.created_at, r.last_activity_at, r.is_archived,
      COUNT(DISTINCT rm.user_id)::int AS member_count,
      (
        SELECT m.body FROM messages m 
        WHERE m.room_id = r.id AND m.is_deleted = false 
        ORDER BY m.created_at DESC LIMIT 1
      ) AS last_message,
      EXISTS(
        SELECT 1 FROM room_members rm2 
        WHERE rm2.room_id = r.id AND rm2.user_id = ${userId}
      ) AS is_member,
      (r.owner_id = ${userId}) AS is_owner
    FROM rooms r
    LEFT JOIN room_members rm ON rm.room_id = r.id
    WHERE r.id = ${roomId}
    GROUP BY r.id
  `);
  return result.rows[0] ?? null;
}

// GET /rooms
router.get("/rooms", requireAuth, async (req, res) => {
  try {
    const userId = req.user!.id;
    const {
      category,
      search,
      limit: limitStr = "20",
      offset: offsetStr = "0",
      myRooms,
    } = req.query as Record<string, string>;

    const limit = Math.min(parseInt(limitStr, 10) || 20, 50);
    const offset = parseInt(offsetStr, 10) || 0;

    let whereClause = sql`r.is_archived = false`;
    if (category) {
      whereClause = sql`${whereClause} AND r.category = ${category}::room_category`;
    }
    if (search) {
      whereClause = sql`${whereClause} AND r.title ILIKE ${"%" + search + "%"}`;
    }
    if (myRooms === "true") {
      whereClause = sql`${whereClause} AND EXISTS (SELECT 1 FROM room_members rm3 WHERE rm3.room_id = r.id AND rm3.user_id = ${userId})`;
    }

    const [rowsResult, countResult] = await Promise.all([
      db.execute(sql`
        SELECT 
          r.id, r.title, r.description, r.category, r.owner_id,
          r.created_at, r.last_activity_at, r.is_archived,
          COUNT(DISTINCT rm.user_id)::int AS member_count,
          (
            SELECT m.body FROM messages m 
            WHERE m.room_id = r.id AND m.is_deleted = false 
            ORDER BY m.created_at DESC LIMIT 1
          ) AS last_message,
          EXISTS(
            SELECT 1 FROM room_members rm2 
            WHERE rm2.room_id = r.id AND rm2.user_id = ${userId}
          ) AS is_member,
          (r.owner_id = ${userId}) AS is_owner
        FROM rooms r
        LEFT JOIN room_members rm ON rm.room_id = r.id
        WHERE ${whereClause}
        GROUP BY r.id
        ORDER BY r.last_activity_at DESC
        LIMIT ${limit} OFFSET ${offset}
      `),
      db.execute(sql`
        SELECT COUNT(DISTINCT r.id)::int AS total
        FROM rooms r
        WHERE ${whereClause}
      `),
    ]);

    const total = (countResult.rows[0] as { total: number })?.total ?? 0;

    res.json({
      rooms: rowsResult.rows.map(formatRoom),
      total,
      hasMore: offset + limit < total,
    });
  } catch (err) {
    req.log.error({ err }, "listRooms error");
    res.status(500).json({ error: "Internal server error" });
  }
});

// GET /rooms/similar
router.get("/rooms/similar", requireAuth, async (req, res) => {
  try {
    const { title, category } = req.query as { title: string; category: string };
    if (!title || !category) {
      res.status(400).json({ error: "title and category required" });
      return;
    }

    const userId = req.user!.id;
    const result = await db.execute(sql`
      SELECT 
        r.id, r.title, r.description, r.category, r.owner_id,
        r.created_at, r.last_activity_at, r.is_archived,
        COUNT(DISTINCT rm.user_id)::int AS member_count,
        NULL AS last_message,
        EXISTS(SELECT 1 FROM room_members rm2 WHERE rm2.room_id = r.id AND rm2.user_id = ${userId}) AS is_member,
        (r.owner_id = ${userId}) AS is_owner
      FROM rooms r
      LEFT JOIN room_members rm ON rm.room_id = r.id
      WHERE r.is_archived = false
        AND r.category = ${category}::room_category
        AND r.title ILIKE ${"%" + title.slice(0, 20) + "%"}
      GROUP BY r.id
      LIMIT 5
    `);

    res.json(result.rows.map(formatRoom));
  } catch (err) {
    req.log.error({ err }, "findSimilarRooms error");
    res.status(500).json({ error: "Internal server error" });
  }
});

// POST /rooms
router.post("/rooms", requireAuth, async (req, res) => {
  try {
    const { title, description, category } = req.body as {
      title: string;
      description?: string;
      category: string;
    };

    if (!title || !category) {
      res.status(400).json({ error: "title and category required" });
      return;
    }
    if (title.length > 100) {
      res.status(400).json({ error: "Title max 100 chars" });
      return;
    }

    const userId = req.user!.id;

    const [room] = await db
      .insert(rooms)
      .values({
        title: title.trim(),
        description: description?.trim() || null,
        category: category as RoomCategory,
        ownerId: userId,
      })
      .returning();

    if (!room) {
      res.status(500).json({ error: "Failed to create room" });
      return;
    }

    // Auto-join as owner
    await db.insert(roomMembers).values({
      roomId: room.id,
      userId,
      role: "owner",
    });

    const meta = await getRoomWithMeta(room.id, userId);
    res.status(201).json(formatRoom(meta));
  } catch (err) {
    req.log.error({ err }, "createRoom error");
    res.status(500).json({ error: "Internal server error" });
  }
});

// GET /rooms/:roomId
router.get("/rooms/:roomId", requireAuth, async (req, res) => {
  try {
    const { roomId } = req.params;
    const userId = req.user!.id;

    const result = await db.execute(sql`
      SELECT 
        r.id, r.title, r.description, r.category, r.owner_id,
        r.created_at, r.last_activity_at, r.is_archived,
        COUNT(DISTINCT rm.user_id)::int AS member_count,
        EXISTS(SELECT 1 FROM room_members rm2 WHERE rm2.room_id = r.id AND rm2.user_id = ${userId}) AS is_member,
        (r.owner_id = ${userId}) AS is_owner,
        p.id AS owner_profile_id, p.username AS owner_username, p.avatar_key AS owner_avatar_key, p.email AS owner_email, p.created_at AS owner_created_at
      FROM rooms r
      LEFT JOIN room_members rm ON rm.room_id = r.id
      JOIN profiles p ON p.id = r.owner_id
      WHERE r.id = ${roomId}
      GROUP BY r.id, p.id
    `);

    const row = result.rows[0] as any;
    if (!row) {
      res.status(404).json({ error: "Room not found" });
      return;
    }

    res.json({
      id: row.id,
      title: row.title,
      description: row.description ?? null,
      category: row.category,
      ownerId: row.owner_id,
      createdAt: row.created_at,
      lastActivityAt: row.last_activity_at,
      isArchived: row.is_archived,
      memberCount: row.member_count ?? 0,
      isMember: row.is_member,
      isOwner: row.is_owner,
      owner: {
        id: row.owner_profile_id,
        username: row.owner_username,
        avatarKey: row.owner_avatar_key,
        email: row.owner_email,
        createdAt: row.owner_created_at,
      },
    });
  } catch (err) {
    req.log.error({ err }, "getRoom error");
    res.status(500).json({ error: "Internal server error" });
  }
});

// PATCH /rooms/:roomId
router.patch("/rooms/:roomId", requireAuth, async (req, res) => {
  try {
    const { roomId } = req.params;
    const userId = req.user!.id;

    const room = await db.query.rooms.findFirst({ where: eq(rooms.id, roomId) });
    if (!room) {
      res.status(404).json({ error: "Room not found" });
      return;
    }
    if (room.ownerId !== userId) {
      res.status(403).json({ error: "Only the owner can edit this room" });
      return;
    }

    const { title, description } = req.body as {
      title?: string;
      description?: string;
    };

    const updates: Partial<{ title: string; description: string | null }> = {};
    if (title !== undefined) updates.title = title.trim();
    if (description !== undefined) updates.description = description?.trim() || null;

    const [updated] = await db
      .update(rooms)
      .set(updates)
      .where(eq(rooms.id, roomId))
      .returning();

    const meta = await getRoomWithMeta(roomId, userId);
    res.json(formatRoom(meta ?? updated));
  } catch (err) {
    req.log.error({ err }, "updateRoom error");
    res.status(500).json({ error: "Internal server error" });
  }
});

// DELETE /rooms/:roomId
router.delete("/rooms/:roomId", requireAuth, async (req, res) => {
  try {
    const { roomId } = req.params;
    const userId = req.user!.id;

    const room = await db.query.rooms.findFirst({ where: eq(rooms.id, roomId) });
    if (!room) {
      res.status(404).json({ error: "Room not found" });
      return;
    }
    if (room.ownerId !== userId) {
      res.status(403).json({ error: "Only the owner can delete this room" });
      return;
    }

    await db.delete(rooms).where(eq(rooms.id, roomId));
    res.status(204).send();
  } catch (err) {
    req.log.error({ err }, "deleteRoom error");
    res.status(500).json({ error: "Internal server error" });
  }
});

// POST /rooms/:roomId/join
router.post("/rooms/:roomId/join", requireAuth, async (req, res) => {
  try {
    const { roomId } = req.params;
    const userId = req.user!.id;

    const room = await db.query.rooms.findFirst({ where: eq(rooms.id, roomId) });
    if (!room) {
      res.status(404).json({ error: "Room not found" });
      return;
    }

    const existing = await db.query.roomMembers.findFirst({
      where: and(eq(roomMembers.roomId, roomId), eq(roomMembers.userId, userId)),
    });
    if (!existing) {
      await db.insert(roomMembers).values({ roomId, userId, role: "member" });
    }

    res.json({ success: true });
  } catch (err) {
    req.log.error({ err }, "joinRoom error");
    res.status(500).json({ error: "Internal server error" });
  }
});

// POST /rooms/:roomId/leave
router.post("/rooms/:roomId/leave", requireAuth, async (req, res) => {
  try {
    const { roomId } = req.params;
    const userId = req.user!.id;

    const room = await db.query.rooms.findFirst({ where: eq(rooms.id, roomId) });
    if (room?.ownerId === userId) {
      res.status(400).json({ error: "Owner cannot leave their own room" });
      return;
    }

    await db.delete(roomMembers).where(
      and(eq(roomMembers.roomId, roomId), eq(roomMembers.userId, userId)),
    );

    res.json({ success: true });
  } catch (err) {
    req.log.error({ err }, "leaveRoom error");
    res.status(500).json({ error: "Internal server error" });
  }
});

// GET /rooms/:roomId/members
router.get("/rooms/:roomId/members", requireAuth, async (req, res) => {
  try {
    const { roomId } = req.params;

    const members = await db.execute(sql`
      SELECT 
        rm.user_id, rm.role, rm.joined_at,
        p.username, p.avatar_key
      FROM room_members rm
      JOIN profiles p ON p.id = rm.user_id
      WHERE rm.room_id = ${roomId}
      ORDER BY rm.joined_at ASC
    `);

    res.json(
      (members.rows as any[]).map((m) => ({
        userId: m.user_id,
        username: m.username,
        avatarKey: m.avatar_key,
        role: m.role,
        joinedAt: m.joined_at,
      })),
    );
  } catch (err) {
    req.log.error({ err }, "getRoomMembers error");
    res.status(500).json({ error: "Internal server error" });
  }
});

// DELETE /rooms/:roomId/members/:userId
router.delete("/rooms/:roomId/members/:userId", requireAuth, async (req, res) => {
  try {
    const { roomId, userId: targetUserId } = req.params;
    const userId = req.user!.id;

    const room = await db.query.rooms.findFirst({ where: eq(rooms.id, roomId) });
    if (!room) {
      res.status(404).json({ error: "Room not found" });
      return;
    }
    if (room.ownerId !== userId) {
      res.status(403).json({ error: "Only the owner can remove members" });
      return;
    }
    if (targetUserId === userId) {
      res.status(400).json({ error: "Cannot remove yourself" });
      return;
    }

    await db.delete(roomMembers).where(
      and(eq(roomMembers.roomId, roomId), eq(roomMembers.userId, targetUserId)),
    );

    res.status(204).send();
  } catch (err) {
    req.log.error({ err }, "removeRoomMember error");
    res.status(500).json({ error: "Internal server error" });
  }
});

// Format DB row to API response shape
function formatRoom(row: any) {
  return {
    id: row.id,
    title: row.title,
    description: row.description ?? null,
    category: row.category,
    ownerId: row.owner_id ?? row.ownerId,
    createdAt: row.created_at ?? row.createdAt,
    lastActivityAt: row.last_activity_at ?? row.lastActivityAt,
    isArchived: row.is_archived ?? row.isArchived,
    memberCount: row.member_count ?? row.memberCount ?? 0,
    lastMessage: row.last_message ?? null,
    isMember: row.is_member ?? row.isMember ?? false,
    isOwner: row.is_owner ?? row.isOwner ?? false,
  };
}

export default router;
