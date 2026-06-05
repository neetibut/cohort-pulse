import rateLimit, { ipKeyGenerator } from 'express-rate-limit';

// Rate limiting tuned for a CLASSROOM: learners may share one public IP (campus/
// office WiFi behind NAT), so the per-IP limits are generous, and the real anti-loop
// guard is keyed by JWT identity (userId) — which is shared-NAT-safe.
//
// IMPORTANT: requires `app.set('trust proxy', 1)` so req.ip is the real client IP
// (Render sits behind a proxy); otherwise every request looks like one IP.

const json429 = (msg) => ({ standardHeaders: 'draft-7', legacyHeaders: false, message: { error: msg } });

// Coarse per-IP flood backstop on all of /api. High enough that ~50 learners on one
// shared network won't trip it during normal use, low enough to stop a real flood.
export const globalLimiter = rateLimit({
  windowMs: 60 * 1000,
  limit: 600, // requests per IP per minute
  ...json429('too many requests from this network — slow down'),
});

// Token minting: stops someone spawning endless identities to evade the per-user
// limit, while still letting a whole class sign in (and re-sign-in) comfortably.
export const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 100, // new sessions per IP per 15 min
  ...json429('too many sign-ins from this network — try again shortly'),
});

// THE anti-loop guard. Keyed by the authenticated user, so a runaway client (a
// looping useEffect, a stuck script) throttles only itself regardless of IP. A
// human posting normally never approaches this; a loop hits it almost immediately.
export const writeLimiter = rateLimit({
  windowMs: 60 * 1000,
  limit: 40, // write actions per user per minute
  keyGenerator: (req) => (req.user?.userId ? `user:${req.user.userId}` : `ip:${ipKeyGenerator(req.ip)}`),
  ...json429('you are doing that too fast — slow down'),
});

// Apply a limiter to mutating requests only; reads (GET/HEAD) pass through.
export function writeOnly(limiter) {
  return (req, res, next) =>
    req.method === 'GET' || req.method === 'HEAD' ? next() : limiter(req, res, next);
}
