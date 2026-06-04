import mongoose from 'mongoose';
import { verifyToken } from '../auth.js';

// Contract §2/§3: every REST route except POST /auth/session and /health requires a
// valid `Authorization: Bearer <token>`. Sets req.user = { userId, displayName } —
// the same shape the checkpoint-01 stub produced, so downstream routes are unchanged.
export function requireAuth(req, res, next) {
  const header = req.get('Authorization') || '';
  const [scheme, token] = header.split(' ');
  if (scheme !== 'Bearer' || !token) {
    return res.status(401).json({ error: 'missing bearer token' });
  }

  let payload;
  try {
    payload = verifyToken(token);
  } catch {
    return res.status(401).json({ error: 'invalid or expired token' });
  }

  if (!payload.userId || !mongoose.isValidObjectId(payload.userId)) {
    return res.status(401).json({ error: 'invalid token subject' });
  }

  req.user = { userId: new mongoose.Types.ObjectId(payload.userId), displayName: payload.displayName };
  next();
}
