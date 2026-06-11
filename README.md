# Cohort Pulse Board

The teaching repo for *From Vibe Coding to Agentic Engineering*. A real-time board
where a cohort posts "pulses" (Stuck / Shipped / Question / Idea) and everyone sees
them appear live: **React on Vercel, Express/Socket.IO on Render, MongoDB Atlas, Redis.**

> **You are on `main` — the completed v2 (multi-room) reference app.** This is the
> finished product, not the starting point.
>
> - **To do the 60-minute live build from scratch**, start on the blank starter:
>   ```bash
>   git checkout checkpoint-00-starter   # then run: claude → /live_build
>   ```
> - **To do the advanced multi-agent build**, you're in the right place: run
>   `claude` here and `/agent_teams_v2`.

## Guided by Claude Code

This repo ships **wizard skills** so your own Claude Code session is the instructor:
`/live_build` (single-agent 60-min build, on `checkpoint-00-starter`),
`/agent_teams_v2` (multi-room with an Agent Team, here on `main`). Helpers:
`/preflight`, `/start`, `/checkpoint`.

## Quick start (this is your pre-flight)

```bash
npm run setup          # installs root + server + client dependencies
cp server/.env.example server/.env   # then fill in MONGODB_URI
cp client/.env.example client/.env   # optional locally
npm run dev            # client on http://localhost:5173, server on http://localhost:3001
curl localhost:3001/health           # -> {"ok":true}
```

If `/health` returns `{"ok":true}` and the client page loads, your pre-flight is done.
Or just run `/preflight` and let Claude check it for you.

## Layout

```
client/    Vite + React + Tailwind frontend  -> deploys to Vercel
server/    Express + Socket.IO + Mongoose backend -> deploys to Render
docs/      contract.md · architecture.md · ai-working-agreement.md · DEPLOY.md
loadtest/  concurrent-client load test (anti-loop / capacity proof)
PRD-v1.md  the 60-minute single-agent build   PRD-v2.md  the multi-room Agent Teams build
.claude/   wizard + helper skills (/live_build, /agent_teams_v2, /preflight, ...)
```

## Checkpoint branches (the safety net)

Each is a known-good milestone you can jump to with one `git checkout`.

**v1 — the 60-minute single-agent build (`/live_build`):**

| Branch | State |
|---|---|
| `checkpoint-00-starter` | Blank starter — structure + deps, no features |
| `checkpoint-01-backend` | Pulses API + Socket.IO + Redis adapter |
| `checkpoint-02-fullstack-local` | Live board working locally across two tabs |
| `checkpoint-03-deployed` | Deploy configs (Render blueprint, deploy guide) |

**v2 — the multi-room Agent Teams build (`/agent_teams_v2`):**

| Branch | State |
|---|---|
| `v2-checkpoint-00-contract` | PRD-v2 + `docs/contract.md` agreed |
| `v2-checkpoint-01-rooms-data` → `-05-frontend` | rooms, auth, realtime, moderation, UI |
| `v2-checkpoint-06-deployed` | Integrated, QA-passed, redeployed → merges to `main` |

```bash
git checkout checkpoint-02-fullstack-local   # example — or run /checkpoint
```

### What the checkpoints are really teaching you

They're not just a way to catch up — they're the point. Take four ideas with you:

1. **Git is your undo button.** Each checkpoint is a *known-good* state you can
   always return to. That safety net is what lets you hand work to an AI agent
   without fear — a bad change is never permanent.
2. **Commit at every working milestone.** We branch the build into stages for the
   same reason you should commit often: so no single change (yours or the agent's)
   can strand you somewhere you can't get back from.
3. **Diffs show you exactly what changed.** Compare two stages to see precisely
   what a step added — the same "review the diff" habit you apply to AI output:
   ```bash
   git diff checkpoint-01-backend checkpoint-02-fullstack-local
   ```
4. **Resetting to a known-good base isn't cheating.** Jumping to a checkpoint and
   moving on is the professional move, not a failure. Knowing *when* to reset
   instead of debugging in circles is a real engineering skill.

## Environment variables

See `server/.env.example` and `client/.env.example`. The only difference between
local and production is the *values* — the code is identical.
