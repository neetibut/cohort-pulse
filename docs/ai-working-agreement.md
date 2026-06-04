# AI Working Agreement

Rules for how the coding agent behaves before a single line of code is written.
Point the agent at this file at the start of every task.

- Before editing files, explain the plan and list the files you will touch.
- Do not introduce new libraries without asking first.
- Prefer small, focused changes over large rewrites.
- After editing, summarize the diff in plain language.
- Flag any uncertainty instead of guessing silently.
- Do not change unrelated files. Stay inside the directory the task names
  (`server/` tasks must not touch `client/`, and vice versa).
- Do not remove existing functionality unless explicitly instructed.
- Keep `/health` returning `{ ok: true }` at all times.
- Read configuration from environment variables — never hardcode URLs, secrets,
  or connection strings.
- If `REDIS_URL` is unset, the server must still run (skip the Redis adapter in
  local mode) rather than crash.
