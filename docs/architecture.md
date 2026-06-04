# Architecture — Cohort Pulse Board

A real-time board: the cohort posts "pulses" and everyone sees them live.

## Data flow

```
  Browser A ──post pulse──▶  Express POST /api/pulses
                                   │
                                   ▼
                            MongoDB Atlas  (save the truth)
                                   │
                                   ▼
                            Socket.IO emit "pulse:new"
                                   │
                            Redis adapter (pub/sub fan-out)
                                   │
              ┌────────────────────┼────────────────────┐
              ▼                    ▼                    ▼
         Browser A            Browser B            Browser C
        (sees it)            (sees it live)       (sees it live)
```

REST writes the truth (Mongo). WebSockets deliver the news. Redis is the
loudspeaker that lets the news reach every client even when the backend runs on
more than one instance.

## Stack — and what each piece actually does here

| Piece | Role |
|---|---|
| Vite + React + Tailwind | Board UI, post form, live presence badge |
| Express | REST API + HTTP server that Socket.IO attaches to |
| Mongoose + MongoDB Atlas | Persists every pulse (history survives refresh/redeploy) |
| Socket.IO (WebSockets) | Pushes new pulses + presence count to every client |
| Redis | Socket.IO pub/sub adapter (cross-instance broadcast) + presence count |
| Vercel | Hosts the React frontend |
| Render | Hosts the Express/Socket.IO backend + Key Value (Redis) |

## Folder structure

```
client/src/
  config.js              # API_URL from VITE_API_URL (falls back to localhost)
  socket.js              # Socket.IO client
  App.jsx                # loads history (REST) + live updates (socket)
  components/
    PulseForm.jsx        # name + type + text -> POST /api/pulses
    PulseCard.jsx        # one pulse, color-coded by type
    PresenceBadge.jsx    # live online count

server/src/
  index.js               # express + http server + wiring
  db.js                  # mongoose connection
  socket.js              # Socket.IO server + redis adapter + presence
  models/Pulse.js        # mongoose schema
  routes/pulses.js       # GET/POST /api/pulses
```

## Data model

`Pulse { author: String, type: "stuck"|"shipped"|"question"|"idea", text: String, createdAt: Date }`

## API

- `GET  /health` → `{ ok: true }`
- `GET  /api/pulses` → last 50 pulses, newest first
- `POST /api/pulses` → `{ author, type, text }` → validates, saves, emits `pulse:new`

## Socket events

- `pulse:new` (server → clients) — a newly created pulse
- `presence:count` (server → clients) — number of connected clients

## Environment

| Where | Variable | Notes |
|---|---|---|
| server | `MONGODB_URI` | Atlas connection string |
| server | `REDIS_URL` | optional locally; Render Key Value internal URL in prod |
| server | `CLIENT_ORIGIN` | comma-separated allowed origins; localhost:5173 always allowed |
| server | `PORT` | unset in prod (Render injects it); defaults to 3001 |
| client | `VITE_API_URL` | backend base URL; falls back to http://localhost:3001 |
