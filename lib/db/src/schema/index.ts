import {
  pgTable,
  pgEnum,
  text,
  boolean,
  timestamp,
  uuid,
  primaryKey,
} from "drizzle-orm/pg-core";

// Enums
export const categoryEnum = pgEnum("room_category", [
  "love",
  "romance",
  "money",
  "business",
  "religion",
  "politics",
  "sports",
  "technology",
  "lifestyle",
  "other",
]);

export const memberRoleEnum = pgEnum("member_role", ["owner", "member"]);

export const reportReasonEnum = pgEnum("report_reason", [
  "spam",
  "harassment",
  "hate",
  "other",
]);

export const reportStatusEnum = pgEnum("report_status", ["open", "resolved"]);

// Tables
export const profiles = pgTable("profiles", {
  id: uuid("id").primaryKey().defaultRandom(),
  email: text("email").notNull().unique(),
  passwordHash: text("password_hash").notNull(),
  username: text("username").notNull().unique(),
  avatarKey: text("avatar_key").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const rooms = pgTable("rooms", {
  id: uuid("id").primaryKey().defaultRandom(),
  title: text("title").notNull(),
  description: text("description"),
  category: categoryEnum("category").notNull(),
  ownerId: uuid("owner_id")
    .references(() => profiles.id, { onDelete: "cascade" })
    .notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  lastActivityAt: timestamp("last_activity_at").defaultNow().notNull(),
  isArchived: boolean("is_archived").default(false).notNull(),
});

export const roomMembers = pgTable(
  "room_members",
  {
    roomId: uuid("room_id")
      .references(() => rooms.id, { onDelete: "cascade" })
      .notNull(),
    userId: uuid("user_id")
      .references(() => profiles.id, { onDelete: "cascade" })
      .notNull(),
    role: memberRoleEnum("role").notNull().default("member"),
    joinedAt: timestamp("joined_at").defaultNow().notNull(),
  },
  (t) => [primaryKey({ columns: [t.roomId, t.userId] })],
);

export const messages = pgTable("messages", {
  id: uuid("id").primaryKey().defaultRandom(),
  roomId: uuid("room_id")
    .references(() => rooms.id, { onDelete: "cascade" })
    .notNull(),
  senderId: uuid("sender_id")
    .references(() => profiles.id, { onDelete: "cascade" })
    .notNull(),
  body: text("body").notNull(),
  replyToId: uuid("reply_to_id"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  isDeleted: boolean("is_deleted").default(false).notNull(),
});

export const blocks = pgTable(
  "blocks",
  {
    blockerId: uuid("blocker_id")
      .references(() => profiles.id, { onDelete: "cascade" })
      .notNull(),
    blockedId: uuid("blocked_id")
      .references(() => profiles.id, { onDelete: "cascade" })
      .notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (t) => [primaryKey({ columns: [t.blockerId, t.blockedId] })],
);

export const reports = pgTable("reports", {
  id: uuid("id").primaryKey().defaultRandom(),
  reporterId: uuid("reporter_id")
    .references(() => profiles.id, { onDelete: "cascade" })
    .notNull(),
  messageId: uuid("message_id")
    .references(() => messages.id, { onDelete: "cascade" })
    .notNull(),
  reason: reportReasonEnum("reason").notNull(),
  note: text("note"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  status: reportStatusEnum("status").default("open").notNull(),
});

export const messageReactions = pgTable(
  "message_reactions",
  {
    messageId: uuid("message_id")
      .references(() => messages.id, { onDelete: "cascade" })
      .notNull(),
    userId: uuid("user_id")
      .references(() => profiles.id, { onDelete: "cascade" })
      .notNull(),
    emoji: text("emoji").notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (t) => [primaryKey({ columns: [t.messageId, t.userId, t.emoji] })],
);

// Types
export type Profile = typeof profiles.$inferSelect;
export type Room = typeof rooms.$inferSelect;
export type RoomMember = typeof roomMembers.$inferSelect;
export type Message = typeof messages.$inferSelect;
export type Block = typeof blocks.$inferSelect;
export type Report = typeof reports.$inferSelect;
export type MessageReaction = typeof messageReactions.$inferSelect;
