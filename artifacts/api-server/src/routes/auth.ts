import { Router } from "express";
import { db } from "@workspace/db";
import { profiles } from "@workspace/db";
import { eq } from "drizzle-orm";
import {
  hashPassword,
  comparePassword,
  signToken,
  requireAuth,
} from "../lib/auth";

const router = Router();

// POST /auth/register
router.post("/auth/register", async (req, res) => {
  try {
    const { email, password, username, avatarKey } = req.body as {
      email: string;
      password: string;
      username: string;
      avatarKey: string;
    };

    if (!email || !password || !username || !avatarKey) {
      res.status(400).json({ error: "All fields are required" });
      return;
    }

    if (password.length < 6) {
      res
        .status(400)
        .json({ error: "Password must be at least 6 characters" });
      return;
    }

    if (username.length < 3 || username.length > 30) {
      res
        .status(400)
        .json({ error: "Username must be 3-30 characters" });
      return;
    }

    if (!/^[a-zA-Z0-9_]+$/.test(username)) {
      res
        .status(400)
        .json({ error: "Username can only contain letters, numbers, underscores" });
      return;
    }

    // Check for existing email or username
    const [existingEmail, existingUsername] = await Promise.all([
      db.query.profiles.findFirst({ where: eq(profiles.email, email.toLowerCase()) }),
      db.query.profiles.findFirst({ where: eq(profiles.username, username.toLowerCase()) }),
    ]);

    if (existingEmail) {
      res.status(409).json({ error: "Email already in use" });
      return;
    }
    if (existingUsername) {
      res.status(409).json({ error: "Username already taken" });
      return;
    }

    const passwordHash = await hashPassword(password);
    const [profile] = await db
      .insert(profiles)
      .values({
        email: email.toLowerCase(),
        passwordHash,
        username: username.toLowerCase(),
        avatarKey,
      })
      .returning();

    if (!profile) {
      res.status(500).json({ error: "Failed to create user" });
      return;
    }

    const token = signToken({
      id: profile.id,
      email: profile.email,
      username: profile.username,
      avatarKey: profile.avatarKey,
    });

    res.status(201).json({
      token,
      user: {
        id: profile.id,
        email: profile.email,
        username: profile.username,
        avatarKey: profile.avatarKey,
        createdAt: profile.createdAt,
      },
    });
  } catch (err) {
    req.log.error({ err }, "register error");
    res.status(500).json({ error: "Internal server error" });
  }
});

// POST /auth/login
router.post("/auth/login", async (req, res) => {
  try {
    const { email, password } = req.body as {
      email: string;
      password: string;
    };

    if (!email || !password) {
      res.status(400).json({ error: "Email and password required" });
      return;
    }

    const profile = await db.query.profiles.findFirst({
      where: eq(profiles.email, email.toLowerCase()),
    });

    if (!profile) {
      res.status(401).json({ error: "Invalid email or password" });
      return;
    }

    const valid = await comparePassword(password, profile.passwordHash);
    if (!valid) {
      res.status(401).json({ error: "Invalid email or password" });
      return;
    }

    const token = signToken({
      id: profile.id,
      email: profile.email,
      username: profile.username,
      avatarKey: profile.avatarKey,
    });

    res.json({
      token,
      user: {
        id: profile.id,
        email: profile.email,
        username: profile.username,
        avatarKey: profile.avatarKey,
        createdAt: profile.createdAt,
      },
    });
  } catch (err) {
    req.log.error({ err }, "login error");
    res.status(500).json({ error: "Internal server error" });
  }
});

// GET /auth/me
router.get("/auth/me", requireAuth, async (req, res) => {
  try {
    const profile = await db.query.profiles.findFirst({
      where: eq(profiles.id, req.user!.id),
    });
    if (!profile) {
      res.status(404).json({ error: "User not found" });
      return;
    }
    res.json({
      id: profile.id,
      email: profile.email,
      username: profile.username,
      avatarKey: profile.avatarKey,
      createdAt: profile.createdAt,
    });
  } catch (err) {
    req.log.error({ err }, "getMe error");
    res.status(500).json({ error: "Internal server error" });
  }
});

// PATCH /auth/me
router.patch("/auth/me", requireAuth, async (req, res) => {
  try {
    const { username, avatarKey } = req.body as {
      username?: string;
      avatarKey?: string;
    };

    const updates: Partial<{ username: string; avatarKey: string }> = {};
    if (username) {
      if (username.length < 3 || username.length > 30) {
        res.status(400).json({ error: "Username must be 3-30 characters" });
        return;
      }
      const existing = await db.query.profiles.findFirst({
        where: eq(profiles.username, username.toLowerCase()),
      });
      if (existing && existing.id !== req.user!.id) {
        res.status(409).json({ error: "Username already taken" });
        return;
      }
      updates.username = username.toLowerCase();
    }
    if (avatarKey) updates.avatarKey = avatarKey;

    if (Object.keys(updates).length === 0) {
      res.status(400).json({ error: "No fields to update" });
      return;
    }

    const [updated] = await db
      .update(profiles)
      .set(updates)
      .where(eq(profiles.id, req.user!.id))
      .returning();

    if (!updated) {
      res.status(404).json({ error: "User not found" });
      return;
    }

    res.json({
      id: updated.id,
      email: updated.email,
      username: updated.username,
      avatarKey: updated.avatarKey,
      createdAt: updated.createdAt,
    });
  } catch (err) {
    req.log.error({ err }, "updateMe error");
    res.status(500).json({ error: "Internal server error" });
  }
});

// DELETE /auth/delete-account
router.delete("/auth/delete-account", requireAuth, async (req, res) => {
  try {
    await db.delete(profiles).where(eq(profiles.id, req.user!.id));
    res.status(204).send();
  } catch (err) {
    req.log.error({ err }, "deleteAccount error");
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
