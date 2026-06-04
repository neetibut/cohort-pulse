# Cohort Pulse Board — Load Test

Simulates N concurrent learners signing in, joining one room over WebSocket, and
posting pulses. Reports latency percentiles, broadcast fan-out latency, presence
accuracy, and failures — so you know what happens before you invite a cohort.

> ⚠️ This hits a **real backend** and writes **real data** (users, a room, pulses).
> Run against a throwaway room; clean up afterward with
> `node ../server/scripts/clear-pulses.mjs` (clears pulses) if pointed at prod.

## Setup

```bash
cd loadtest
npm install
```

## Run

```bash
# 50 clients against the deployed backend (default)
node loadtest.mjs

# worst case: everyone hits at the exact same moment
N=50 RAMP_MS=0 node loadtest.mjs

# against your local dev server
TARGET=http://localhost:3001 N=50 node loadtest.mjs

# heavier: 2 posts each, gentle ramp
N=50 POSTS=2 RAMP_MS=60 node loadtest.mjs
```

## Options (env vars)

| Var | Default | Meaning |
|---|---|---|
| `TARGET` | `https://cohort-pulse-bkiz.onrender.com` | backend base URL |
| `N` | `50` | number of simulated clients |
| `RAMP_MS` | `40` | stagger between client starts (`0` = simultaneous burst) |
| `POSTS` | `1` | pulses each client posts |
| `ROOM` | *(fresh room)* | reuse an existing room slug instead of creating one |
| `DRAIN_MS` | `4000` | wait for late broadcasts before reporting |
| `HTTP_TIMEOUT_MS` | `90000` | request timeout (tolerates Render cold start) |

## Reading the results

- **auth / socket connect / room:join** — `ok X/N` and p50/p95/max latency. A high
  **max auth** on the first request usually means a Render **cold start** (warm the
  server before a demo).
- **broadcast latency** — time from one client's POST to other clients receiving
  `pulse:new`. This is the number that grows when everyone is in one room at once.
- **max presence observed** — should approach `N` if all clients are in the room
  together (deduped by identity).
- **failures** — counts per stage, with the first error message per stage.

## Tip for a real cohort demo

Warm the backend first (`curl <TARGET>/health`), pre-create the demo room, and
consider a paid Render instance for the session to remove cold starts and give real
CPU. See the deployment notes for details.
