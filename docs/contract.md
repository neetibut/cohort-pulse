# Contract — Cohort Pulse Board v2 (Multi-Room)

> **The shared coordination surface for the Agent Team.** Backend, Realtime, and
> Frontend all build against this. **No role changes an endpoint, event, or shape
> without the Contract Lead updating this file first** (and pinging the affected
> roles). This is what keeps four parallel workstreams in sync — see
> [`../PRD.md`](../PRD.md) §5–6.
>
> Status: **v2-checkpoint-00 draft.** Contract Lead owns; others propose changes.

---

## 1. Data models (MongoDB / Mongoose)

```
User {
  _id: ObjectId
  displayName: string   // 1..60, trimmed
  createdAt: Date
}

Room {
  _id: ObjectId
  slug: string          // unique, url-safe, lowercased, e.g. "cohort-7"
  name: string          // 1..80
  ownerId: ObjectId     // -> User
  moderatorIds: ObjectId[]   // owner is implicitly a moderator
  isPrivate: boolean
  accessCode?: string   // required iff isPrivate; never returned to clients
  members: ObjectId[]   // -> User; everyone who has joined (owner included)
  createdAt: Date
}

Pulse {
  _id: ObjectId
  roomId: ObjectId      // -> Room   (indexed)
  authorId: ObjectId    // -> User
  authorName: string    // denormalized snapshot for display
  type: "stuck" | "shipped" | "question" | "idea"
  text: string          // 1..280, trimmed
  pinned: boolean       // default false
  createdAt: Date
}
```

**Authorization roles:** `member` (joined the room), `moderator` (in
`moderatorIds`), `owner` (`ownerId`). Owner ⊇ moderator ⊇ member.

## 2. Auth

- **Token:** JWT signed with `JWT_SECRET`, payload `{ userId, displayName }`,
  ~30-day expiry.
- **REST:** send `Authorization: Bearer <token>`.
- **Socket:** send on handshake — `io(URL, { auth: { token } })`.
- Missing/invalid token → REST `401`; socket connection rejected with `connect_error`.

## 3. REST API

Base path `/api`. All except `POST /auth/session` require a valid token.
Error shape is always `{ "error": "<message>" }`.

| Method & path | Body | Returns | Notes |
|---|---|---|---|
| `POST /auth/session` | `{ displayName }` | `{ token, user }` | creates/reuses a User, issues JWT |
| `GET /rooms` | — | `Room[]` (public-safe) | public rooms + rooms the caller has joined |
| `POST /rooms` | `{ name, isPrivate, accessCode? }` | `Room` | caller becomes `ownerId` |
| `POST /rooms/:slug/join` | `{ accessCode? }` | `{ room, membership }` | 403 on bad/missing code for private |
| `GET /rooms/:slug/pulses` | — | `Pulse[]` (≤50, pinned first then newest) | members only |
| `POST /rooms/:slug/pulses` | `{ type, text }` | `Pulse` | members only; emits `pulse:new` |
| `DELETE /rooms/:slug/pulses/:id` | — | `{ ok: true }` | moderator+; emits `pulse:deleted` |
| `POST /rooms/:slug/pulses/:id/pin` | `{ pinned }` | `Pulse` | moderator+; emits `pulse:pinned` |
| `POST /rooms/:slug/moderate` | `{ action: "mute"\|"remove", targetUserId }` | `{ ok: true }` | moderator+; emits `moderation:applied` |
| `GET /health` | — | `{ ok: true }` | unchanged from v1 |

**Public-safe `Room`** = all fields except `accessCode`.

### Resolved during checkpoint-01 (Contract Lead ratified)
- **Membership** is modeled as `Room.members: ObjectId[]` (no separate collection).
  `POST /rooms/:slug/join` returns `{ room: <public-safe>, membership: { roomId, userId } }`.
- **Slug** is derived server-side from `name` (`slugify`: lowercase, non-alnum → `-`,
  trimmed, ≤80). `POST /rooms` takes no `slug`. Duplicate slug → `409 { error }`.
- The **`lobby`** room is owned by a synthetic `System` user seeded at startup.
- The v1 global `/api/pulses` route is **deprecated** (its Pulse docs predate
  `roomId`/`authorId`). It stays mounted but unused; checkpoint-06 backfills v1
  pulses into `lobby` and retires it (PRD §9).

## 4. Socket.IO events

A client, once connected with a valid token, **joins one room at a time**:

- `client → server` `room:join { slug }` → server validates membership, joins the
  socket to Socket.IO room `room:<slug>`, replies `room:joined { slug }`, then emits
  current `presence:members`. (Leaving the previous room is implicit.)
- `client → server` `room:leave { slug }`

All broadcasts below are **scoped to `room:<slug>`** (never global):

| Event (server → clients) | Payload | When |
|---|---|---|
| `pulse:new` | `Pulse` | a pulse is created in the room |
| `pulse:deleted` | `{ id }` | a pulse is deleted |
| `pulse:pinned` | `Pulse` | a pulse's `pinned` changed |
| `presence:members` | `{ slug, members: { userId, displayName }[], count }` | join/leave/disconnect |
| `moderation:applied` | `{ action, targetUserId, byUserId }` | a mute/remove happened |

**Presence rule:** dedupe by `userId` (two tabs of one person = one member).
Source of truth = the identities of sockets currently in `room:<slug>`, resolved via
the Redis adapter so it's correct across instances.

## 5. Redis

- Socket.IO Redis adapter (as in v1) — broadcasts fan out across instances.
- Per-room presence is derived from sockets in `room:<slug>` (adapter-aware
  `fetchSockets()` of that room), deduped by `userId` from the socket's auth.
- Keep the v1 behavior: if `REDIS_URL` is unset, run in local single-instance mode.

## 6. Frontend contract notes

- Store `token` + `user` after `POST /auth/session`.
- Maintain `currentRoom`; on switch: REST `GET …/pulses` for history, then
  `room:join` over socket for live + presence. Tear down listeners on switch.
- Show moderation controls only when `user.userId === room.ownerId ||
  room.moderatorIds.includes(user.userId)`. (Server still enforces; UI is a hint.)

## 7. Open questions (Contract Lead to resolve with the team)

- Mute semantics: server-side drop of the muted user's posts, or client-side hide?
  (Proposed: server-side reject with 403 while muted — authoritative.)
- Room deletion / archiving — deferred to a later checkpoint unless trivial.
