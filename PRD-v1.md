# PRD — Cohort Pulse Board v1: The Live Board

> **The initial build.** A single, shared, real-time board — the artifact for the
> course's **60-minute live fullstack build** (facilitator script:
> `agentic-engineering-course/live-build-60min-runbook.md`). It is built by **one
> agent** driving the agentic loop, and it is the foundation that
> [`PRD-v2.md`](./PRD-v2.md) (Multi-Room, built by an Agent Team) extends — *not*
> replaces. v1 lives on branches `checkpoint-00-starter` → `checkpoint-03-deployed`.

---

## 1. Summary

**Cohort Pulse Board** — a single shared wall where a cohort drops a "pulse"
(Stuck / Shipped / Question / Idea) and everyone watching sees it appear **live**,
with a count of how many people are online. It is deliberately the smallest app that
forces every piece of the target stack to do real, non-decorative work.

## 2. Goals & non-goals

**Goals**
- Anyone can post a pulse (name + type + text); it persists and is readable.
- New pulses appear **live** on every open client without a refresh.
- A live **online-presence count** of connected clients.
- Ship it: deployed fullstack on Vercel (frontend) + Render (backend), with MongoDB
  Atlas and Redis.
- Be buildable, end to end, in a single ~60-minute live session driven by AI.

**Non-goals (these are exactly what v2 adds — see [`PRD-v2.md`](./PRD-v2.md))**
- No rooms — one global board shared by everyone.
- No identity or auth — a pulse just carries a typed-in author name.
- No moderation, pinning, or per-person presence.

## 3. Users & core story

- **Cohort member / learner:** "During a live session I drop a pulse and the whole
  room sees it instantly; I can see how many of us are online."
- **Instructor:** "I share one URL; everyone lands on the same board and we watch it
  fill up together on the shared screen."

## 4. Functional requirements

- **Post a pulse** — name, type (`stuck`/`shipped`/`question`/`idea`), text.
- **Load history** — the board shows the most recent pulses, newest first.
- **Live updates** — a new pulse is pushed to every connected client.
- **Presence** — a live count of connected clients, updated on connect/disconnect.

## 5. Data model

`Pulse { author: String, type: "stuck"|"shipped"|"question"|"idea", text: String, createdAt: Date }`

> Note: v1 stores the author as a plain `author` string and the board is global.
> v2 migrates this to `{ roomId, authorId, authorName, pinned }` and backfills v1
> pulses into a `lobby` room (see [`PRD-v2.md`](./PRD-v2.md) §9 and
> `server/scripts/backfill-lobby.mjs`).

## 6. API

- `GET  /health` → `{ ok: true }`
- `GET  /api/pulses` → last 50 pulses, newest first
- `POST /api/pulses` → `{ author, type, text }` → validates, saves, emits `pulse:new`

## 7. Socket events

- `pulse:new` (server → all clients) — a newly created pulse
- `presence:count` (server → all clients) — number of connected clients

> v2 replaces this global model: broadcasts and presence become **per-room**
> (`presence:members` scoped to `room:<slug>`), and a JWT handshake gates the socket.

## 8. Stack & deployment

| Piece | Role |
|---|---|
| Vite + React + Tailwind | Board UI, post form, live presence badge → **Vercel** |
| Express | REST API + HTTP server Socket.IO attaches to → **Render** |
| Mongoose + MongoDB Atlas | Persists every pulse |
| Socket.IO (WebSockets) | Pushes new pulses + presence to every client |
| Redis (Redis Cloud) | Socket.IO pub/sub adapter (cross-instance broadcast) |

REST writes the truth (Mongo); WebSockets deliver the news; Redis is the loudspeaker.

## 9. Checkpoints (the v1 branch line)

| Branch | State |
|---|---|
| `checkpoint-00-starter` | Cloned starter, deps installed, `/health` works |
| `checkpoint-01-backend` | Pulses API + Socket.IO + Redis adapter, runs locally |
| `checkpoint-02-fullstack-local` | Board + live updates working across two tabs |
| `checkpoint-03-deployed` | Render + Vercel live, demoed |

## 10. Success criteria

- Two tabs of the deployed URL: a pulse posted in one appears live in the other.
- The presence badge climbs as people open the page; pulses survive a refresh
  (persisted in Atlas).
- The whole build + deploy fits in the 60-minute live session.

## 11. Relationship to v2

v1 proves the agentic loop with **one agent** and a single shared board.
[`PRD-v2.md`](./PRD-v2.md) extends this exact app into a **multi-room** product
(rooms, JWT identity, per-room presence, moderation), built by a **Claude Agent
Team** — the course's Version 3 advanced-track demonstration. Same repo, same stack;
`main` now points at v2.
