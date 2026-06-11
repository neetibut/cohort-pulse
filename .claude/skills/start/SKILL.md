---
name: start
description: Boot the Cohort Pulse dev servers (client + server) in the background and verify both are reachable.
user_invocable: true
---

# Start the App

You boot the development servers for the Cohort Pulse Board and confirm they are up.
Keep it quick and report clearly.

## Steps

1. **Sanity check env** — confirm `server/.env` exists with a `MONGODB_URI`. If not,
   stop and tell the student to run `/preflight` first; don't boot a server that will
   immediately fail to reach the database.

2. **Boot both servers in the background** from the repo root:
   ```bash
   npm run dev
   ```
   Run it in the background so it keeps running across turns. This starts the Express
   server on `http://localhost:3001` and the Vite client on `http://localhost:5173`
   (via `concurrently`). On the bare `checkpoint-00-starter` there is no client dev
   server yet — in that case boot only the server with `npm run dev:server`, or note
   that the client is not built yet.

3. **Verify the server** — poll health until it answers (up to ~15s):
   ```bash
   curl -s -m 3 localhost:3001/health
   ```
   Expect `{"ok":true}`. If it never comes up, surface the server log lines — the most
   likely cause is an unreachable Atlas cluster (run `/preflight` to confirm).

4. **Verify the client** *(if it's running)* — a quick `curl -s -m 3 -o /dev/null -w
   "%{http_code}" localhost:5173` returning `200` is enough; the student opens it in a
   browser.

## Output

Report a two-line status: server (URL + health result) and client (URL + reachable?).
If both are up, tell the student which URL to open and remind them that for the live
two-tab test they'll open `localhost:5173` in **two** tabs. Note that the servers are
running in the background; they can be stopped at the end of the session.
