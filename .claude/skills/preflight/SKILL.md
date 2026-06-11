---
name: preflight
description: Verify the machine is ready for the Cohort Pulse build — Node version, branch, env file, Atlas reachability, and a green /health.
user_invocable: true
---

# Pre-flight Check

You are running a pre-flight readiness check for the Cohort Pulse live build. Run the
checks below, then print a compact red/green table and a one-line verdict. Do the work
yourself (run the commands); don't make the student run them one by one. Be concise.

## Checks

1. **Node version** — run `node -v`. Green if 20 or higher.
2. **Git branch** — run `git branch --show-current`. For the v1 build the student
   should be on `checkpoint-00-starter`. Note (not fail) if they are elsewhere.
3. **Server env file** — check `server/.env` exists and has a non-empty `MONGODB_URI`.
   Green if present; red with the fix `cp server/.env.example server/.env` if missing.
   (`REDIS_URL` may be blank locally — that's fine, note it, don't fail.)
4. **Dependencies installed** — check `node_modules/` exists at root, `server/`, and
   `client/`. Red with the fix `npm run setup` if any is missing.
5. **Atlas reachability** *(only if `MONGODB_URI` is set)* — this is the #1 failure
   mode, so test it explicitly. From `server/`, run a short connection probe with a
   5-second timeout, e.g.:
   ```bash
   node -e "import('mongoose').then(m=>m.default.connect(process.env.MONGODB_URI,{serverSelectionTimeoutMS:5000}).then(()=>{console.log('atlas: OK');process.exit(0)}).catch(e=>{console.log('atlas: FAIL -',e.message.split('\n')[0]);process.exit(1)}))"
   ```
   (Load the env first, e.g. `node -r dotenv/config -e "..."` run from `server/`.)
   If it fails, the fix is almost always: Atlas **IP allowlist** must include
   `0.0.0.0/0`, the cluster must not be **paused**, and the password in the URI must
   be URL-encoded.
6. **Health endpoint** *(optional, only if a server is already running)* — run
   `curl -s -m 3 localhost:3001/health`. Green if it returns `{"ok":true}`. If nothing
   is running yet, mark N/A — `/start` or `npm run dev` will bring it up.

## Output

Print a table like:

| Check | Status | Fix if red |
|---|---|---|
| Node ≥ 20 | ✅ v20.11.0 | — |
| Branch | ✅ checkpoint-00-starter | — |
| server/.env + MONGODB_URI | ✅ | — |
| Deps installed | ✅ | — |
| Atlas reachable | ❌ FAIL - timeout | allowlist 0.0.0.0/0 · un-pause cluster |
| /health | N/A (server not running) | — |

End with one line: **"Pre-flight GREEN — you're ready"** or **"Pre-flight has N
blocker(s) — fix the red rows above before building."** Do not start servers or change
any files; this skill only reports.
