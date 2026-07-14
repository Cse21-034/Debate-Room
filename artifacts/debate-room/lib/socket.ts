import { io, type Socket } from 'socket.io-client';
import type { Message } from './api';

let socket: Socket | null = null;

export function connectSocket(token: string): Socket {
  if (socket?.connected) return socket;

  const domain = process.env.EXPO_PUBLIC_DOMAIN;
  const url = `https://${domain}`;

  socket = io(url, {
    auth: { token },
    transports: ['websocket', 'polling'],
    reconnection: true,
    reconnectionAttempts: 5,
    reconnectionDelay: 1000,
  });

  socket.on('connect', () => {
    console.log('[Socket] connected');
  });
  socket.on('disconnect', (reason: string) => {
    console.log('[Socket] disconnected:', reason);
  });
  socket.on('connect_error', (err: Error) => {
    console.warn('[Socket] connect error:', err.message);
  });

  return socket;
}

export function disconnectSocket(): void {
  socket?.disconnect();
  socket = null;
}

export function getSocket(): Socket | null {
  return socket;
}

export function joinRoomChannel(roomId: string): void {
  socket?.emit('join_room', roomId);
}

export function leaveRoomChannel(roomId: string): void {
  socket?.emit('leave_room', roomId);
}

export function emitTypingStart(roomId: string): void {
  socket?.emit('typing_start', roomId);
}

export function emitTypingStop(roomId: string): void {
  socket?.emit('typing_stop', roomId);
}

export type SocketEvents = {
  new_message: (msg: Message) => void;
  message_deleted: (data: { messageId: string }) => void;
  online_count: (data: { roomId: string; count: number }) => void;
  typing_update: (data: { roomId: string; typingUsernames: string[] }) => void;
};
