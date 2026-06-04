import { Router } from 'express';
import { User } from '../models/User.js';
import { signToken } from '../auth.js';

export function authRouter() {
  const router = Router();

  // POST /api/auth/session { displayName } -> { token, user }
  // Creates a minimal User and issues a JWT carrying { userId, displayName }.
  // Identity stays stable across sessions by reusing the token (contract §4.1),
  // not by deduping on displayName (names are not unique).
  router.post('/session', async (req, res) => {
    const displayName = (req.body?.displayName ?? '').trim();
    if (!displayName) {
      return res.status(400).json({ error: 'displayName is required' });
    }
    if (displayName.length > 60) {
      return res.status(400).json({ error: 'displayName must be at most 60 characters' });
    }

    const user = await User.create({ displayName });
    const token = signToken({ userId: user._id, displayName: user.displayName });
    res.status(201).json({ token, user: { userId: user._id, displayName: user.displayName } });
  });

  return router;
}
