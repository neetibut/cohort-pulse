# PRD — Cohort Pulse Board v2: Multi-Room

> **This is an add-on to the v1 build — see [`PRD-v1.md`](./PRD-v1.md).** v1 (the
> 60-minute live build) is a single shared board, deployed on Render + Vercel, on
> branches `checkpoint-00-starter` → `checkpoint-03-deployed`. **v2 extends that
> same app**; it does not replace it. The v2 work lives on `v2-checkpoint-*`
> branches built on top of `main`.
>
> **Why v2 exists:** it is the teaching artifact for the course's *Version 3 ·
> Advanced Track* topic **"Multi-agent workflows."** v2 is deliberately scoped as a
> job for a **Claude Agent Team** — multiple collaborating peer agents with distinct
> roles, coordinating through a shared contract — *not* a single agent and *not*
> subagent fan-out. This PRD and [`docs/contract.md`](./docs/contract.md) are the
> inputs the team executes against.

---

## 1. Summary

Turn the single global Cohort Pulse Board into a **multi-room** app: a person signs
in with a display name, joins or creates a **room** (a cohort/breakout space), and
posts pulses that are live only within that room. Each room shows its **online
members**, and room **owners/moderators** can delete, pin, or mute. Everything that
was real-time in v1 stays real-time — now scoped per room.

## 2. Goals & non-goals

**Goals**
- Pulses are scoped to rooms; live updates and presence are per-room.
- Lightweight identity (a persistent display name via a signed token) so moderation
  and presence can attribute actions to a person.
- Room lifecycle: create, join (public or via access code), list.
- Moderation: delete a pulse, pin a pulse, mute/remove a member — broadcast live.
- Per-room presence backed by Redis, accurate across reconnects and instances.
- Ship it: redeploy the same Render + Vercel + Atlas + Redis Cloud topology.

**Non-goals (explicitly out of scope for v2)**
- Real password/OAuth auth, email verification, password reset. (Identity is a
  signed display-name token — enough to attribute actions, not a security product.)
- Direct messages, threads, reactions, file/image uploads, search.
- Roles beyond owner / moderator / member. No org/tenant layer.
- Mobile app. (Responsive web only, as in v1.)

## 3. Users & core stories

- **Member:** "I sign in with my name, join my cohort's room by its link/code, and
  post pulses my cohort sees live." / "I can see who else is in the room right now."
- **Room owner:** "I create a room for my cohort, share the join link, and keep it
  on-track by pinning the key update and removing noise."
- **Moderator (owner-appointed):** "I can delete or pin pulses and mute a disruptive
  member."

## 4. Functional requirements

### 4.1 Identity & auth (lightweight)
- `POST /api/auth/session { displayName }` issues a **JWT** carrying `{ userId,
  displayName }`; the client stores it and sends it on REST (Authorization header)
  and on the **socket handshake** (`auth.token`).
- A minimal `User` document is persisted (so `userId` is stable across sessions if
  the token is reused). No passwords.
- Protected REST + socket connections require a valid token.

### 4.2 Rooms
- `Room { slug, name, ownerId, isPrivate, accessCode?, moderatorIds[] }`.
- Create a room (creator becomes owner). Join by `slug`; if `isPrivate`, an
  `accessCode` is required. A default public **`lobby`** room always exists.
- List rooms the user can see (public rooms + rooms they've joined).

### 4.3 Pulses (room-scoped)
- `Pulse { roomId, authorId, authorName, type, text, pinned, createdAt }` — the v1
  `type` enum (stuck/shipped/question/idea) is unchanged.
- Read last 50 for a room; create within a room (members only); pinned pulses sort
  to the top.

### 4.4 Moderation (owner/moderator only)
- Delete any pulse · pin/unpin a pulse · mute or remove a member.
- Every action is authorized server-side and **broadcast live** to the room.

### 4.5 Presence (per room, Redis-backed)
- On socket join, a client enters socket room `room:<slug>`; the server emits the
  room's **member list + count**. On disconnect/leave, presence updates live.
- Presence is keyed by **identity**, not raw sockets (two tabs = one member), and is
  correct across backend instances via Redis.

## 5. Contract = the team's coordination surface

The full REST + Socket.IO event + data-model spec lives in
[`docs/contract.md`](./docs/contract.md). **This is the heart of the Agent Teams
demo:** every role reads and writes against it, and no role may change an
endpoint/event/shape without the Contract Lead updating `contract.md` first. The
contract is what makes this a *team* problem rather than four independent tasks.

## 6. Agent Teams orchestration plan

**This is the demonstration.** v2 is built by a team of collaborating peer agents,
each owning a slice, coordinating through `docs/contract.md`.

| Role | Owns | Reads from contract | Writes to contract |
|---|---|---|---|
| **Contract Lead / Integrator** | `docs/contract.md`, integration, merges, final acceptance check | — | the whole thing; arbitrates changes |
| **Backend & Data** | Mongoose models, REST routes, auth issue/verify, moderation authorization | models, REST shapes | flags model/endpoint gaps |
| **Realtime** | Socket.IO auth handshake, room join, scoped broadcasts, Redis presence | event names/payloads, room keys | proposes event changes |
| **Frontend** | Auth screen, room switcher/create/join, member list, moderation UI, live wiring | REST + events + payload shapes | flags UX-driven shape needs |
| **QA / Review** | Tests + review pass against §4 acceptance criteria | acceptance criteria | files defects, not code |

**Hand-off sequence (maps 1:1 to the v2 checkpoints in §7):**
1. **Contract Lead** drafts `contract.md` → everyone agrees the surface. *(this branch)*
2. **Parallel:** Backend builds data+REST+auth; Realtime builds socket auth + rooms +
   presence; Frontend builds shells against the contract (mocking where the backend
   isn't ready yet).
3. **Integrate** the three against a running backend; Contract Lead resolves drift.
4. **Moderation** is cross-cutting (touches all three) — coordinated through the
   contract in one synchronized pass.
5. **QA** runs acceptance checks; team fixes; **deploy**.

**Why a team and not one agent or fan-out:** the work splits into *distinct,
interdependent roles* (#1) that share *one contract they must keep consistent* (#2)
and pass work back and forth with review loops (#3) — the exact profile where peer
coordination beats both a single thread and independent subagent lookups.

## 7. v2 checkpoint branches (continuing the v1 approach)

Same safety-net + teaching device as v1 — each is a known-good milestone, and each
corresponds to a team hand-off above.

| Branch | State | Primary role(s) |
|---|---|---|
| `v2-checkpoint-00-contract` | PRD + `docs/contract.md` agreed *(this branch)* | Contract Lead |
| `v2-checkpoint-01-rooms-data` | Room/User models + room-scoped pulses REST | Backend |
| `v2-checkpoint-02-auth` | Session/identity JWT + protected REST & socket handshake | Backend + Realtime |
| `v2-checkpoint-03-realtime-rooms` | Socket rooms + per-room Redis presence + scoped broadcasts | Realtime |
| `v2-checkpoint-04-moderation` | Delete / pin / mute, authorized + broadcast | cross-cutting |
| `v2-checkpoint-05-frontend` | Room switcher, member list, moderation UI, full live wiring | Frontend |
| `v2-checkpoint-06-deployed` | Integrated, QA-passed, redeployed to Render + Vercel | QA / Integrator |

When v2 is complete and verified, `v2-checkpoint-06-deployed` merges to `main`.

## 8. Success criteria

- Two people in **room A** see each other's pulses + presence live; a person in
  **room B** sees neither A's pulses nor A's members.
- Posting in a room the user hasn't joined is rejected.
- A non-moderator cannot delete/pin/mute (server returns 403); a moderator can, and
  the result is visible live to the room.
- Presence counts a person once regardless of how many tabs they have open, and is
  correct across backend instances (Redis-backed).
- The deployed app passes the same browser-based end-to-end check we used for v1.

## 9. Rollout

Same topology as v1: backend on Render (`server/`), frontend on Vercel (`client/`),
MongoDB Atlas, Redis Cloud. No new infrastructure. New env: a `JWT_SECRET` on Render.
Existing v1 pulses migrate into the `lobby` room (one-off backfill) so nothing is
lost.
