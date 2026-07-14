import { Router } from "express";
import { db } from "@workspace/db";
import { blocks, profiles } from "@workspace/db";
import { eq, and, sql } from "drizzle-orm";
import { requireAuth } from "../lib/auth";

const router = Router();

// GET /blocks
router.get("/blocks", requireAuth, async (req, res) => {
  try {
    const userId = req.user!.id;

    const result = await db.execute(sql`
      SELECT 
        b.blocked_id AS user_id,
        b.created_at AS blocked_at,
        p.username,
        p.avatar_key
      FROM blocks b
      JOIN profiles p ON p.id = b.blocked_id
      WHERE b.blocker_id = ${userId}
      ORDER BY b.created_at DESC
    `);

    res.json(
      (result.rows as any[]).map((r) => ({
        userId: r.user_id,
        username: r.username,
        avatarKey: r.avatar_key,
        blockedAt: r.blocked_at,
      })),
    );
  } catch (err) {
    req.log.error({ err }, "listBlocks error");
    res.status(500).json({ error: "Internal server error" });
  }
});

// POST /blocks
router.post("/blocks", requireAuth, async (req, res) => {
  try {
    const userId = req.user!.id;
    const { blockedId } = req.body as { blockedId: string };

    if (!blockedId) {
      res.status(400).json({ error: "blockedId required" });
      return;
    }
    if (blockedId === userId) {
      res.status(400).json({ error: "Cannot block yourself" });
      return;
    }

    const targetUser = await db.query.profiles.findFirst({
      where: eq(profiles.id, blockedId),
    });
    if (!targetUser) {
      res.status(404).json({ error: "User not found" });
      return;
    }

    // Upsert — ignore if already blocked
    await db
      .insert(blocks)
      .values({ blockerId: userId, blockedId })
      .onConflictDoNothing();

    res.status(201).json({ success: true });
  } catch (err) {
    req.log.error({ err }, "blockUser error");
    res.status(500).json({ error: "Internal server error" });
  }
});

// DELETE /blocks/:userId
router.delete("/blocks/:userId", requireAuth, async (req, res) => {
  try {
    const userId = req.user!.id;
    const { userId: blockedId } = req.params;

    await db.delete(blocks).where(
      and(eq(blocks.blockerId, userId), eq(blocks.blockedId, blockedId)),
    );

    res.status(204).send();
  } catch (err) {
    req.log.error({ err }, "unblockUser error");
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
