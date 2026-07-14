import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';

const BASE_URL = `https://${process.env.EXPO_PUBLIC_DOMAIN}/api`;

export async function getToken(): Promise<string | null> {
  if (Platform.OS === 'web') {
    return typeof localStorage !== 'undefined' ? localStorage.getItem('auth_token') : null;
  }
  return SecureStore.getItemAsync('auth_token');
}

export async function saveToken(token: string): Promise<void> {
  if (Platform.OS === 'web') {
    if (typeof localStorage !== 'undefined') localStorage.setItem('auth_token', token);
    return;
  }
  await SecureStore.setItemAsync('auth_token', token);
}

export async function deleteToken(): Promise<void> {
  if (Platform.OS === 'web') {
    if (typeof localStorage !== 'undefined') localStorage.removeItem('auth_token');
    return;
  }
  await SecureStore.deleteItemAsync('auth_token');
}

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const token = await getToken();
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...(options.headers as Record<string, string> ?? {}),
  };

  const response = await fetch(`${BASE_URL}${path}`, {
    ...options,
    headers,
  });

  if (response.status === 204) return undefined as T;

  const data = await response.json();
  if (!response.ok) {
    throw new Error(data?.error ?? 'Request failed');
  }
  return data as T;
}

// ---- Types (mirrored from OpenAPI) ----

export type Profile = {
  id: string;
  email: string;
  username: string;
  avatarKey: string;
  createdAt: string;
};

export type Room = {
  id: string;
  title: string;
  description: string | null;
  category: string;
  ownerId: string;
  createdAt: string;
  lastActivityAt: string;
  isArchived: boolean;
  memberCount: number;
  lastMessage: string | null;
  isMember: boolean;
  isOwner: boolean;
};

export type RoomDetail = Room & {
  owner: Profile;
};

export type RoomMember = {
  userId: string;
  username: string;
  avatarKey: string;
  role: 'owner' | 'member';
  joinedAt: string;
};

export type Reaction = {
  emoji: string;
  count: number;
  userIds: string[];
};

export type Message = {
  id: string;
  roomId: string;
  senderId: string;
  senderUsername: string;
  senderAvatarKey: string;
  body: string;
  replyToId: string | null;
  replyToBody: string | null;
  replyToSenderUsername: string | null;
  createdAt: string;
  isDeleted: boolean;
  reactions: Reaction[];
};

export type BlockedUser = {
  userId: string;
  username: string;
  avatarKey: string;
  blockedAt: string;
};

// ---- API client ----

export const api = {
  auth: {
    register: (data: { email: string; password: string; username: string; avatarKey: string }) =>
      request<{ token: string; user: Profile }>('/auth/register', {
        method: 'POST',
        body: JSON.stringify(data),
      }),
    login: (data: { email: string; password: string }) =>
      request<{ token: string; user: Profile }>('/auth/login', {
        method: 'POST',
        body: JSON.stringify(data),
      }),
    me: () => request<Profile>('/auth/me'),
    updateMe: (data: { username?: string; avatarKey?: string }) =>
      request<Profile>('/auth/me', { method: 'PATCH', body: JSON.stringify(data) }),
    deleteAccount: () => request<void>('/auth/delete-account', { method: 'DELETE' }),
  },

  rooms: {
    list: (params?: {
      category?: string;
      search?: string;
      limit?: number;
      offset?: number;
      myRooms?: boolean;
    }) => {
      const q = new URLSearchParams();
      if (params?.category) q.set('category', params.category);
      if (params?.search) q.set('search', params.search);
      if (params?.limit != null) q.set('limit', String(params.limit));
      if (params?.offset != null) q.set('offset', String(params.offset));
      if (params?.myRooms) q.set('myRooms', 'true');
      const qs = q.toString();
      return request<{ rooms: Room[]; total: number; hasMore: boolean }>(`/rooms${qs ? `?${qs}` : ''}`);
    },
    similar: (title: string, category: string) =>
      request<Room[]>(`/rooms/similar?title=${encodeURIComponent(title)}&category=${encodeURIComponent(category)}`),
    create: (data: { title: string; description?: string; category: string }) =>
      request<Room>('/rooms', { method: 'POST', body: JSON.stringify(data) }),
    get: (id: string) => request<RoomDetail>(`/rooms/${id}`),
    update: (id: string, data: { title?: string; description?: string }) =>
      request<Room>(`/rooms/${id}`, { method: 'PATCH', body: JSON.stringify(data) }),
    delete: (id: string) => request<void>(`/rooms/${id}`, { method: 'DELETE' }),
    join: (id: string) => request<{ success: boolean }>(`/rooms/${id}/join`, { method: 'POST' }),
    leave: (id: string) => request<{ success: boolean }>(`/rooms/${id}/leave`, { method: 'POST' }),
    members: (id: string) => request<RoomMember[]>(`/rooms/${id}/members`),
    removeMember: (roomId: string, userId: string) =>
      request<void>(`/rooms/${roomId}/members/${userId}`, { method: 'DELETE' }),
  },

  messages: {
    list: (roomId: string, params?: { before?: string; limit?: number }) => {
      const q = new URLSearchParams();
      if (params?.before) q.set('before', params.before);
      if (params?.limit != null) q.set('limit', String(params.limit));
      const qs = q.toString();
      return request<{ messages: Message[]; hasMore: boolean }>(
        `/rooms/${roomId}/messages${qs ? `?${qs}` : ''}`,
      );
    },
    send: (roomId: string, data: { body: string; replyToId?: string | null }) =>
      request<Message>(`/rooms/${roomId}/messages`, {
        method: 'POST',
        body: JSON.stringify(data),
      }),
    delete: (messageId: string) =>
      request<{ success: boolean }>(`/messages/${messageId}`, { method: 'DELETE' }),
    report: (messageId: string, data: { reason: string; note?: string }) =>
      request<{ success: boolean }>(`/messages/${messageId}/report`, {
        method: 'POST',
        body: JSON.stringify(data),
      }),
    react: (messageId: string, emoji: string) =>
      request<{ reactions: Reaction[] }>(`/messages/${messageId}/react`, {
        method: 'POST',
        body: JSON.stringify({ emoji }),
      }),
  },

  blocks: {
    list: () => request<BlockedUser[]>('/blocks'),
    block: (blockedId: string) =>
      request<{ success: boolean }>('/blocks', {
        method: 'POST',
        body: JSON.stringify({ blockedId }),
      }),
    unblock: (userId: string) => request<void>(`/blocks/${userId}`, { method: 'DELETE' }),
  },
};
