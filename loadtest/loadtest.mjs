// Cohort Pulse Board — concurrent-client load test.
//
// Simulates N learners signing in, joining one room over WebSocket, and posting,
// then reports latency percentiles, broadcast fan-out latency, presence accuracy,
// and failures. Hits a REAL backend + writes REAL data (users/room/pulses).
//
// Usage (from this loadtest/ directory, after `npm install`):
//   node loadtest.mjs                          # 50 clients vs the deployed backend
//   N=50 node loadtest.mjs                     # explicit client count
//   N=20 RAMP_MS=0 node loadtest.mjs           # worst-case simultaneous burst
//   TARGET=http://localhost:3001 N=50 node loadtest.mjs   # against local dev
//   ROOM=demo POSTS=2 node loadtest.mjs        # reuse an existing room, 2 posts each
//
// Env vars (all optional):
//   TARGET    backend base URL              (default https://cohort-pulse-bkiz.onrender.com)
//   N         number of simulated clients   (default 50)
//   RAMP_MS   stagger between client starts (default 40; 0 = all at once)
//   POSTS     pulses each client posts       (default 1)
//   ROOM      existing room slug to reuse    (default: create a fresh "loadtest-<ts>")
//   DRAIN_MS  wait for late broadcasts at end (default 4000)
//   HTTP_TIMEOUT_MS                          (default 90000 — tolerates Render cold start)

import { io } from 'socket.io-client';

const cfg = {
  target: (process.env.TARGET || 'https://cohort-pulse-bkiz.onrender.com').replace(/\/$/, ''),
  n: Number(process.env.N || 50),
  rampMs: Number(process.env.RAMP_MS ?? 40),
  posts: Number(process.env.POSTS ?? 1),
  room: process.env.ROOM || '',
  drainMs: Number(process.env.DRAIN_MS || 4000),
  httpTimeout: Number(process.env.HTTP_TIMEOUT_MS || 90000),
  runId: Date.now().toString(36),
};

const now = () => Date.now();
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function postJSON(url, body, token) {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), cfg.httpTimeout);
  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'content-type': 'application/json', ...(token ? { authorization: `Bearer ${token}` } : {}) },
      body: JSON.stringify(body),
      signal: ctrl.signal,
    });
    const text = await res.text();
    let json; try { json = JSON.parse(text); } catch { json = { raw: text }; }
    if (!res.ok) throw new Error(`HTTP ${res.status}: ${json.error || text.slice(0, 80)}`);
    return json;
  } finally { clearTimeout(t); }
}

function once(emitter, event, ms) {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => { emitter.off(event, on); reject(new Error(`timeout waiting for ${event}`)); }, ms);
    function on(payload) { clearTimeout(timer); emitter.off(event, on); resolve(payload); }
    emitter.on(event, on);
  });
}

function pct(arr, p) {
  if (!arr.length) return 0;
  const s = [...arr].sort((a, b) => a - b);
  return s[Math.min(s.length - 1, Math.ceil((p / 100) * s.length) - 1)];
}
const fmt = (arr) => arr.length ? `p50 ${pct(arr,50)}ms · p95 ${pct(arr,95)}ms · max ${pct(arr,100)}ms` : '(no samples)';

const agg = {
  authMs: [], connMs: [], joinMs: [], bcastMs: [],
  authOk: 0, connOk: 0, joinOk: 0, postsOk: 0, maxPresence: 0,
  fails: {},
};
const fail = (stage, e) => { agg.fails[stage] = (agg.fails[stage] || 0) + 1; if (!agg._firstErr?.[stage]) { (agg._firstErr ||= {})[stage] = String(e.message || e); } };

async function ensureRoom() {
  // A "host" identity creates the room (or we reuse ROOM). Clients join it (public).
  const host = await postJSON(`${cfg.target}/api/auth/session`, { displayName: `loadhost-${cfg.runId}` });
  if (cfg.room) return cfg.room;
  const room = await postJSON(`${cfg.target}/api/rooms`, { name: `Loadtest ${cfg.runId}` }, host.token);
  return room.slug;
}

async function runClient(i, slug) {
  // 1) sign in
  let token;
  const tA = now();
  try { const r = await postJSON(`${cfg.target}/api/auth/session`, { displayName: `load-${i}-${cfg.runId}` }); token = r.token; agg.authMs.push(now() - tA); agg.authOk++; }
  catch (e) { return fail('auth', e); }
  // 2) become a member (required before socket room:join)
  try { await postJSON(`${cfg.target}/api/rooms/${slug}/join`, {}, token); }
  catch (e) { return fail('join-rest', e); }
  // 3) connect socket with the token
  const sock = io(cfg.target, { auth: { token }, transports: ['websocket'], reconnection: false, timeout: 20000 });
  const tC = now();
  try { await once(sock, 'connect', 20000); agg.connMs.push(now() - tC); agg.connOk++; }
  catch (e) { fail('socket-connect', e); sock.close(); return; }
  sock.on('pulse:new', (p) => { const m = /lt:(\d+):/.exec(p?.text || ''); if (m) agg.bcastMs.push(now() - Number(m[1])); });
  sock.on('presence:members', (pm) => { if (pm?.count > agg.maxPresence) agg.maxPresence = pm.count; });
  // 4) join the room over the socket
  const tJ = now();
  sock.emit('room:join', { slug });
  try { await once(sock, 'room:joined', 20000); agg.joinMs.push(now() - tJ); agg.joinOk++; }
  catch (e) { fail('room-join', e); }
  // 5) post pulses (timestamp embedded so receivers can measure broadcast latency)
  for (let p = 0; p < cfg.posts; p++) {
    try { await postJSON(`${cfg.target}/api/rooms/${slug}/pulses`, { type: 'shipped', text: `lt:${Date.now()}:${i}` }, token); agg.postsOk++; }
    catch (e) { fail('post', e); }
  }
  return sock; // keep open so it keeps receiving others' broadcasts until drain
}

(async () => {
  console.log(`\n=== Cohort Pulse load test ===`);
  console.log(`target=${cfg.target}  clients=${cfg.n}  ramp=${cfg.rampMs}ms  posts=${cfg.posts}/client`);
  const t0 = now();

  let slug;
  try { slug = await ensureRoom(); } catch (e) { console.error('setup failed (could not create/reach room):', e.message); process.exit(1); }
  console.log(`room=${slug}\nlaunching...`);

  const sockets = [];
  const launches = [];
  for (let i = 0; i < cfg.n; i++) {
    launches.push(runClient(i, slug).then((s) => { if (s) sockets.push(s); }));
    if (cfg.rampMs) await sleep(cfg.rampMs);
  }
  await Promise.all(launches);

  console.log(`all clients done posting; draining broadcasts for ${cfg.drainMs}ms...`);
  await sleep(cfg.drainMs);
  for (const s of sockets) s.close();

  const wall = ((now() - t0) / 1000).toFixed(1);
  console.log(`\n--- results (${wall}s wall) ---`);
  console.log(`auth:           ${agg.authOk}/${cfg.n} ok   ${fmt(agg.authMs)}`);
  console.log(`socket connect: ${agg.connOk}/${cfg.n} ok   ${fmt(agg.connMs)}`);
  console.log(`room:join:      ${agg.joinOk}/${cfg.n} ok   ${fmt(agg.joinMs)}`);
  console.log(`pulses posted:  ${agg.postsOk}   broadcast receives: ${agg.bcastMs.length}   ${fmt(agg.bcastMs)}`);
  console.log(`max presence observed: ${agg.maxPresence} (expected ~${cfg.n})`);
  const totalFails = Object.values(agg.fails).reduce((a, b) => a + b, 0);
  if (totalFails) { console.log(`failures: ${JSON.stringify(agg.fails)}`); console.log(`first error per stage: ${JSON.stringify(agg._firstErr)}`); }
  else console.log(`failures: none ✅`);
  if (agg.authMs.length && pct(agg.authMs, 100) > 8000) console.log(`note: max auth latency is high — likely a Render cold start on the first request.`);
  console.log('');
  process.exit(0);
})();
