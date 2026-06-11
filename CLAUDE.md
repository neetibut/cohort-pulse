# CLAUDE.md — Cohort Pulse Board

Guidance for Claude Code running in this repo. This is the **v1 starter** version:
deliberately minimal. The real product context lives in `docs/` — and pointing you at
those docs is part of the lesson (`/live_build`, Part 1), so this file stays lean on
purpose.

## What this repo is

A teaching project for *From Vibe Coding to Agentic Engineering*. It builds the
**Cohort Pulse Board** — a real-time board where a cohort posts "pulses" (Stuck /
Shipped / Question / Idea) and everyone sees them live. Two tracks, each driven by a
wizard skill:

| Run this | On branch | What it teaches |
|---|---|---|
| `/live_build` | `checkpoint-00-starter` | 60-min single-agent fullstack build + deploy (the agentic loop) |
| `/agent_teams_v2` | `main` | Extending the app to multi-room with a **team** of agents + a shared contract |

Helper skills: `/preflight` (is this machine ready?), `/start` (boot the dev servers),
`/checkpoint` (where am I vs the known-good branches?).

## Where context lives

- `docs/architecture.md` — the stack and the data-flow (REST writes the truth,
  WebSockets deliver the news, Redis is the loudspeaker).
- `docs/ai-working-agreement.md` — the rules you (the agent) follow: plan before
  editing, no new libraries without asking, small changes, summarize the diff.
- `PRD-v1.md` — what the v1 build is. `PRD-v2.md` + `docs/contract.md` — the v2 spec.
- `docs/DEPLOY.md` — Render + Vercel deployment.

## Commands

```bash
npm run setup    # install root + server + client deps
npm run dev      # server :3001 + client :5173 (concurrently)
curl localhost:3001/health   # -> {"ok":true}
```

## Rules

- Server work stays in `server/`; client work stays in `client/`. Don't cross them.
- Read config from environment variables — never hardcode URLs or secrets.
- Keep `/health` returning `{ ok: true }` at every checkpoint.
- `.claude/settings.json` is the permission guardrail (and a teaching artifact) — the
  dev loop is pre-approved; `git push` and destructive commands are denied.
