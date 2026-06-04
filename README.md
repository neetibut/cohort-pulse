# Cohort Pulse Board — Starter

The starter repo for the **60-minute live fullstack build** that accompanies
*From Vibe Coding to Agentic Engineering*.

You will build a real-time board where the cohort posts "pulses"
(Stuck / Shipped / Question / Idea) and everyone sees them appear live, then
deploy it: **React on Vercel, Express/Socket.IO on Render, MongoDB Atlas, Redis.**

This branch (`main` / `checkpoint-00-starter`) ships **structure and dependencies,
not features**. You build the features live with Claude Code.

## Quick start (this is your pre-flight)

```bash
npm run setup          # installs root + server + client dependencies
cp server/.env.example server/.env   # then fill in MONGODB_URI
cp client/.env.example client/.env   # optional locally
npm run dev            # client on http://localhost:5173, server on http://localhost:3001
curl localhost:3001/health           # -> {"ok":true}
```

If `/health` returns `{"ok":true}` and the client page loads, your pre-flight is done.

## Layout

```
client/   Vite + React + Tailwind frontend  -> deploys to Vercel
server/   Express + Socket.IO + Mongoose backend -> deploys to Render
docs/     architecture.md, ai-working-agreement.md  (read these first)
```

## Checkpoint branches (the safety net)

If you fall behind during the live build, jump to the latest checkpoint and rejoin:

| Branch | State |
|---|---|
| `checkpoint-00-starter` | This blank starter |
| `checkpoint-01-backend` | Pulses API + Socket.IO + Redis adapter |
| `checkpoint-02-fullstack-local` | Live board working locally across two tabs |
| `checkpoint-03-deployed` | Deploy configs (Render blueprint, deploy guide) |

```bash
git checkout checkpoint-02-fullstack-local   # example
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
