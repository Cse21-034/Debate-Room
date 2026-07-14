---
name: DebateRoom architecture
description: Key decisions for the DebateRoom app — stack, auth, realtime, DB
---

## Stack
- **Backend**: Express (artifact `artifacts/api-server`) with Socket.io for real-time, JWT via `jsonwebtoken` + `bcryptjs`
- **Database**: Replit's built-in PostgreSQL via Drizzle ORM in `lib/db`; schema pushed with `pnpm --filter @workspace/db run push`
- **Frontend**: Expo Router app (`artifacts/debate-room`), dark-only theme

## Auth
- JWT stored in `expo-secure-store` (native) / `localStorage` (web) via `lib/api.ts` helpers
- `AuthContext` restores session on mount by calling `/api/auth/me` with stored token
- `AuthGate` component in `_layout.tsx` handles redirect logic (not-authed → login, authed → tabs)

## Real-time
- Socket.io client connects after login, stays connected across screens
- Room channel: `join_room` / `leave_room` events
- Events: `new_message`, `message_deleted`, `online_count`, `typing_update`
- Messages state is managed locally in `room/[id].tsx`; socket events append/update it

## API client
- Direct `fetch` wrapper in `lib/api.ts` (not generated hooks) — simpler for real-time message management
- Codegen (`@workspace/api-client-react`) is still available for other uses

**Why no Supabase**: User declined to provide credentials; switched to Replit's built-in Postgres.
**Why not generated hooks for messages**: Real-time via Socket.io requires local state management; generated hooks add React Query overhead that conflicts.
