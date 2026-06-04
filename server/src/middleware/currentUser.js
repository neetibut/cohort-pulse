import mongoose from 'mongoose';
import { User } from '../models/User.js';

// TODO(checkpoint-02): replace stub auth. This temporary middleware reads identity
// from request headers instead of a JWT so the room routes are testable now.
// In checkpoint-02 this gets swapped for `Authorization: Bearer <token>` verification
// (payload { userId, displayName }) per contract §2 — same req.user contract downstream.
export async function currentUser(req, res, next) {
  try {
    const headerId = req.get('X-User-Id');
    const headerName = req.get('X-User-Name');

    let user = null;
    if (headerId && mongoose.isValidObjectId(headerId)) {
      user = await User.findById(headerId);
    }
    // No (valid) existing user: mint one from the supplied name so the caller has
    // a stable identity for this request. Real auth will make this token-driven.
    if (!user) {
      const displayName = (headerName || '').trim();
      if (!displayName) {
        return res.status(401).json({ error: 'X-User-Id or X-User-Name required (stub auth)' });
      }
      user = await User.create({ displayName });
    }

    req.user = { userId: user._id, displayName: user.displayName };
    next();
  } catch (err) {
    next(err);
  }
}
