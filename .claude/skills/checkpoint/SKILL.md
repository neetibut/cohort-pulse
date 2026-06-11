---
name: checkpoint
description: Show where you are relative to the Cohort Pulse checkpoint branches and how to jump to a known-good state.
user_invocable: true
---

# Checkpoint Status

You help the student understand where they are in the build relative to the
known-good checkpoint branches, and how to safely jump to one. Checkpoints are the
safety net: each is a milestone you can always return to, so handing work to an agent
is never risky.

## The checkpoint lineage

**v1 — the 60-minute single-agent build (`/live_build`):**

| Branch | State |
|---|---|
| `checkpoint-00-starter` | Blank starter — structure + deps, no features |
| `checkpoint-01-backend` | Pulses API + Socket.IO + Redis adapter, runs locally |
| `checkpoint-02-fullstack-local` | Live board working locally across two tabs |
| `checkpoint-03-deployed` | Deploy configs (Render blueprint + deploy guide) |

**v2 — the multi-room Agent Teams build (`/agent_teams_v2`):**

| Branch | State |
|---|---|
| `v2-checkpoint-00-contract` | PRD-v2 + `docs/contract.md` agreed |
| `v2-checkpoint-01-rooms-data` | Room/User models + room-scoped pulses REST |
| `v2-checkpoint-02-auth` | Session/identity JWT + protected REST & socket |
| `v2-checkpoint-03-realtime-rooms` | Socket rooms + per-room Redis presence |
| `v2-checkpoint-04-moderation` | Delete / pin / mute, authorized + broadcast |
| `v2-checkpoint-05-frontend` | Room switcher, member list, moderation UI |
| `v2-checkpoint-06-deployed` | Integrated, QA-passed, redeployed |

`main` holds the completed v2 reference app.

## What to do

1. Run `git branch --show-current` and `git status --short` to see the current branch
   and whether the working tree is dirty.
2. Tell the student which checkpoint they're on (or nearest to) and what the *next*
   milestone is.
3. If they want to jump to a checkpoint:
   - If the tree is dirty, warn them first — uncommitted work will be left behind.
     Offer `git stash` or a commit before switching.
   - The jump itself is just `git checkout <branch>`.
4. Reinforce the lesson, briefly: jumping to a known-good checkpoint and moving on is
   the **professional move**, not cheating. Knowing *when* to reset instead of
   debugging in circles is a real engineering skill. You can also compare two stages
   to see exactly what a step added:
   ```bash
   git diff checkpoint-01-backend checkpoint-02-fullstack-local
   ```

Report concisely. Do not switch branches or change files yourself unless the student
explicitly asks you to.
