# CLAUDE.md — Cohort Pulse Board (v2, Multi-Room)

Guidance for Claude Code in this repo. This is the **v2 / `main`** version: pre-filled
and exemplary, because the lesson here is building with a clean, shared context and a
contract that multiple agents must keep consistent.

## What this repo is

A teaching project for *From Vibe Coding to Agentic Engineering*. The app is the
**Cohort Pulse Board** — a real-time board where cohorts post "pulses" (Stuck /
Shipped / Question / Idea). v1 is one global board built by a single agent; **v2
(here) is the multi-room product built by a team of agents.**

| Run this | On branch | Teaches |
|---|---|---|
| `/agent_teams_v2` | `main` | Extending to multi-room with an **Agent Team** + a shared contract |
| `/live_build` | `checkpoint-00-starter` | The original 60-min single-agent fullstack build |

Helpers: `/preflight`, `/start`, `/checkpoint`.

## The coordination contract (read this first)

- **`docs/contract.md` is the law.** It is the precise REST + Socket.IO event +
  data-model spec. **No endpoint, event, or data shape changes without updating
  `docs/contract.md` FIRST**, then notifying the affected roles. This single rule is
  what keeps parallel agents from drifting apart.
- `PRD-v2.md` — goals/non-goals, the role table, the checkpoint→hand-off map.
- `PRD-v1.md` — the v1 foundation v2 extends (not replaces).

## Stack & layout

| Piece | Role |
|---|---|
| Vite + React + Tailwind (`client/`) | Board UI, rooms, presence, moderation → Vercel |
| Express + Socket.IO + Mongoose (`server/`) | REST + realtime + auth + moderation → Render |
| MongoDB Atlas | Persists users, rooms, pulses |
| Redis | Socket.IO adapter (cross-instance broadcast) + per-room presence |

```
client/  src/{components,...}      server/  src/{models,routes,middleware,...}
docs/    contract.md · architecture.md · ai-working-agreement.md · DEPLOY.md
loadtest/  concurrent-client load test     server/scripts/  backfill-lobby, clean-test-data
```

## Commands

```bash
npm run setup    # install root + server + client deps
npm run dev      # server :3001 + client :5173
curl localhost:3001/health   # -> {"ok":true}
```

## Working rules (the AI working agreement, condensed — full text in docs/)

- Plan before editing; list the files you'll touch. No new libraries without asking.
- Small, focused changes; summarize the diff; flag uncertainty instead of guessing.
- **Stay in your directory.** `server/` tasks don't touch `client/` and vice versa.
- Read config from env vars — never hardcode URLs or secrets. New v2 env: `JWT_SECRET`.
- Keep `/health` returning `{ ok: true }` at all times.
- For team builds: teammates edit only their own area and **never run git** — the
  Integrator owns all commits and the checkpoint lineage.

## What NOT to do

- Don't change a contract shape in code and "update the doc later" — the doc changes
  first, or the team drifts.
- Don't have multiple agents commit; don't let a teammate touch another's directory.
- Don't add real password/OAuth auth — v2 identity is a signed display-name token by
  design (see `PRD-v2.md` non-goals).
