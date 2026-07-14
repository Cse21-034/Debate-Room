import { Server, type Socket } from "socket.io";
import type { Server as HttpServer } from "http";
import { verifyToken } from "./lib/auth";
import { logger } from "./lib/logger";

let io: Server | null = null;

export function getIO(): Server | null {
  return io;
}

// Track typing users: roomId -> Set of usernames
const typingMap = new Map<string, Map<string, NodeJS.Timeout>>();

export function setupSocket(httpServer: HttpServer): Server {
  io = new Server(httpServer, {
    cors: {
      origin: "*",
      methods: ["GET", "POST"],
    },
    transports: ["websocket", "polling"],
  });

  // Auth middleware
  io.use((socket, next) => {
    const token = socket.handshake.auth?.token as string | undefined;
    if (!token) {
      next(new Error("No token provided"));
      return;
    }
    try {
      socket.data.user = verifyToken(token);
      next();
    } catch {
      next(new Error("Invalid token"));
    }
  });

  io.on("connection", (socket: Socket) => {
    const user = socket.data.user as {
      id: string;
      username: string;
      avatarKey: string;
    };

    logger.info({ userId: user.id }, "Socket connected");

    // Join a room's channel
    socket.on("join_room", (roomId: string) => {
      socket.join(roomId);
      const count = io!.sockets.adapter.rooms.get(roomId)?.size ?? 0;
      io!.to(roomId).emit("online_count", { roomId, count });
    });

    // Leave a room's channel
    socket.on("leave_room", (roomId: string) => {
      socket.leave(roomId);
      const count = io!.sockets.adapter.rooms.get(roomId)?.size ?? 0;
      io!.to(roomId).emit("online_count", { roomId, count });
    });

    // Typing indicator
    socket.on("typing_start", (roomId: string) => {
      if (!typingMap.has(roomId)) typingMap.set(roomId, new Map());
      const roomTyping = typingMap.get(roomId)!;

      // Clear existing timeout
      const existing = roomTyping.get(user.id);
      if (existing) clearTimeout(existing);

      // Auto-stop after 4s of no update
      const timeout = setTimeout(() => {
        roomTyping.delete(user.id);
        socket.to(roomId).emit("typing_update", {
          roomId,
          typingUsernames: [...roomTyping.values()],
        });
      }, 4000);

      roomTyping.set(user.id, timeout);

      socket.to(roomId).emit("typing_update", {
        roomId,
        typingUsernames: [user.username],
      });
    });

    socket.on("typing_stop", (roomId: string) => {
      const roomTyping = typingMap.get(roomId);
      if (roomTyping) {
        const timeout = roomTyping.get(user.id);
        if (timeout) clearTimeout(timeout);
        roomTyping.delete(user.id);
        socket.to(roomId).emit("typing_update", {
          roomId,
          typingUsernames: [],
        });
      }
    });

    socket.on("disconnect", () => {
      logger.info({ userId: user.id }, "Socket disconnected");
      // Clean up typing for all rooms
      for (const [, roomTyping] of typingMap) {
        const timeout = roomTyping.get(user.id);
        if (timeout) clearTimeout(timeout);
        roomTyping.delete(user.id);
      }
    });
  });

  return io;
}
