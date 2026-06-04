import jwt from 'jsonwebtoken';

// Shared token logic — the coordination seam between Backend (REST) and Realtime
// (socket handshake). Both halves import verifyToken from here. Contract §2: JWT
// signed with JWT_SECRET, payload { userId, displayName }, ~30-day expiry.
const TOKEN_TTL = '30d';
const DEV_SECRET = 'dev-insecure-jwt-secret';

let warnedNoSecret = false;
function secret() {
  const s = process.env.JWT_SECRET;
  if (s) return s;
  // Dev fallback so the app runs locally without config; never use in production.
  if (!warnedNoSecret) {
    warnedNoSecret = true;
    console.warn(
      '[auth] JWT_SECRET is not set — falling back to an INSECURE dev default. ' +
        'Set JWT_SECRET in the environment (required on Render).'
    );
  }
  return DEV_SECRET;
}

export function signToken(user) {
  const payload = { userId: String(user.userId ?? user._id), displayName: user.displayName };
  return jwt.sign(payload, secret(), { expiresIn: TOKEN_TTL });
}

// Returns { userId, displayName } or throws if the token is missing/invalid/expired.
export function verifyToken(token) {
  const payload = jwt.verify(token, secret());
  return { userId: payload.userId, displayName: payload.displayName };
}
