import mongoose from 'mongoose';
import { Router } from 'express';
import { Room } from '../models/Room.js';
import { Pulse, PULSE_TYPES } from '../models/Pulse.js';

// Is the caller a member of (i.e. has joined) this room?
function isMember(room, userId) {
  return room.members.some((m) => m.equals(userId));
}

// moderator+ (contract §1): the owner, or anyone listed in moderatorIds.
function isModerator(room, userId) {
  return room.ownerId.equals(userId) || room.moderatorIds.some((m) => m.equals(userId));
}

// Is this user currently muted in the room?
function isMuted(room, userId) {
  return room.mutedIds.some((m) => m.equals(userId));
}

export function roomsRouter(io) {
  const router = Router();

  // Identity (req.user) is set by the requireAuth middleware mounted on /api (index.js).

  // GET /api/rooms -> public rooms + rooms the caller has joined.
  router.get('/', async (req, res) => {
    const rooms = await Room.find({
      $or: [{ isPrivate: false }, { members: req.user.userId }],
    }).sort({ createdAt: 1 });
    res.json(rooms.map((r) => r.toPublicJSON()));
  });

  // POST /api/rooms -> caller becomes ownerId (and an implicit member).
  router.post('/', async (req, res) => {
    const { name, isPrivate, accessCode } = req.body ?? {};
    if (!name || !String(name).trim()) {
      return res.status(400).json({ error: 'name is required' });
    }
    if (isPrivate && !(accessCode && String(accessCode).trim())) {
      return res.status(400).json({ error: 'accessCode is required for a private room' });
    }

    const slug = slugify(name);
    if (!slug) {
      return res.status(400).json({ error: 'name must contain url-safe characters' });
    }
    if (await Room.exists({ slug })) {
      return res.status(409).json({ error: `a room with slug "${slug}" already exists` });
    }

    const room = await Room.create({
      slug,
      name: String(name).trim(),
      ownerId: req.user.userId,
      isPrivate: Boolean(isPrivate),
      accessCode: isPrivate ? String(accessCode).trim() : undefined,
      members: [req.user.userId],
    });
    res.status(201).json(room.toPublicJSON());
  });

  // POST /api/rooms/:slug/join -> join a room; private rooms require accessCode.
  router.post('/:slug/join', async (req, res) => {
    const room = await Room.findOne({ slug: req.params.slug.toLowerCase() });
    if (!room) return res.status(404).json({ error: 'room not found' });

    if (room.isPrivate && !isMember(room, req.user.userId)) {
      const { accessCode } = req.body ?? {};
      if (!accessCode || String(accessCode).trim() !== room.accessCode) {
        return res.status(403).json({ error: 'invalid or missing access code' });
      }
    }

    if (!isMember(room, req.user.userId)) {
      room.members.push(req.user.userId);
      await room.save();
    }

    res.json({
      room: room.toPublicJSON(),
      membership: { roomId: room._id, userId: req.user.userId },
    });
  });

  // GET /api/rooms/:slug/pulses -> last 50, pinned first then newest. Members only.
  router.get('/:slug/pulses', async (req, res) => {
    const room = await Room.findOne({ slug: req.params.slug.toLowerCase() });
    if (!room) return res.status(404).json({ error: 'room not found' });
    if (!isMember(room, req.user.userId)) {
      return res.status(403).json({ error: 'join the room to read its pulses' });
    }

    const pulses = await Pulse.find({ roomId: room._id })
      .sort({ pinned: -1, createdAt: -1 })
      .limit(50)
      .lean();
    res.json(pulses);
  });

  // POST /api/rooms/:slug/pulses -> create within a room. Members only.
  router.post('/:slug/pulses', async (req, res) => {
    const room = await Room.findOne({ slug: req.params.slug.toLowerCase() });
    if (!room) return res.status(404).json({ error: 'room not found' });
    if (!isMember(room, req.user.userId)) {
      return res.status(403).json({ error: 'join the room to post pulses' });
    }
    // Mute is server-side authoritative (contract §7): muted members can't post.
    if (isMuted(room, req.user.userId)) {
      return res.status(403).json({ error: 'you are muted in this room' });
    }

    const { type, text } = req.body ?? {};
    if (!type || !text) {
      return res.status(400).json({ error: 'type and text are required' });
    }
    if (!PULSE_TYPES.includes(type)) {
      return res.status(400).json({ error: `type must be one of ${PULSE_TYPES.join(', ')}` });
    }

    const pulse = await Pulse.create({
      roomId: room._id,
      authorId: req.user.userId,
      authorName: req.user.displayName,
      type,
      text,
    });
    // Scoped broadcast to the room — global emit is wrong now (contract §4).
    io.to(`room:${room.slug}`).emit('pulse:new', pulse);
    res.status(201).json(pulse);
  });

  // DELETE /api/rooms/:slug/pulses/:id -> remove a pulse. moderator+ only.
  router.delete('/:slug/pulses/:id', async (req, res) => {
    const room = await Room.findOne({ slug: req.params.slug.toLowerCase() });
    if (!room) return res.status(404).json({ error: 'room not found' });
    if (!isModerator(room, req.user.userId)) {
      return res.status(403).json({ error: 'moderator privileges required' });
    }
    if (!mongoose.isValidObjectId(req.params.id)) {
      return res.status(404).json({ error: 'pulse not found' });
    }

    const deleted = await Pulse.findOneAndDelete({ _id: req.params.id, roomId: room._id });
    if (!deleted) return res.status(404).json({ error: 'pulse not found' });

    io.to(`room:${room.slug}`).emit('pulse:deleted', { id: req.params.id });
    res.json({ ok: true });
  });

  // POST /api/rooms/:slug/pulses/:id/pin -> set a pulse's pinned flag. moderator+ only.
  router.post('/:slug/pulses/:id/pin', async (req, res) => {
    const room = await Room.findOne({ slug: req.params.slug.toLowerCase() });
    if (!room) return res.status(404).json({ error: 'room not found' });
    if (!isModerator(room, req.user.userId)) {
      return res.status(403).json({ error: 'moderator privileges required' });
    }
    const { pinned } = req.body ?? {};
    if (typeof pinned !== 'boolean') {
      return res.status(400).json({ error: 'pinned must be a boolean' });
    }
    if (!mongoose.isValidObjectId(req.params.id)) {
      return res.status(404).json({ error: 'pulse not found' });
    }

    const pulse = await Pulse.findOneAndUpdate(
      { _id: req.params.id, roomId: room._id },
      { pinned },
      { new: true }
    ).lean();
    if (!pulse) return res.status(404).json({ error: 'pulse not found' });

    io.to(`room:${room.slug}`).emit('pulse:pinned', pulse);
    res.json(pulse);
  });

  // POST /api/rooms/:slug/moderate -> mute or remove a member. moderator+ only.
  router.post('/:slug/moderate', async (req, res) => {
    const room = await Room.findOne({ slug: req.params.slug.toLowerCase() });
    if (!room) return res.status(404).json({ error: 'room not found' });
    if (!isModerator(room, req.user.userId)) {
      return res.status(403).json({ error: 'moderator privileges required' });
    }

    const { action, targetUserId } = req.body ?? {};
    if (action !== 'mute' && action !== 'remove') {
      return res.status(400).json({ error: "action must be 'mute' or 'remove'" });
    }
    if (!targetUserId || !mongoose.isValidObjectId(targetUserId)) {
      return res.status(400).json({ error: 'a valid targetUserId is required' });
    }
    // The owner can't be muted or removed by anyone (including other moderators).
    if (room.ownerId.equals(targetUserId)) {
      return res.status(403).json({ error: 'the room owner cannot be moderated' });
    }
    // Can only moderate someone who is currently a member of the room.
    if (!isMember(room, targetUserId)) {
      return res.status(404).json({ error: 'target is not a member of this room' });
    }

    if (action === 'mute') {
      if (!isMuted(room, targetUserId)) {
        room.mutedIds.push(targetUserId);
        await room.save();
      }
    } else {
      // remove: drop from members, and clear any mute/moderator standing they held.
      room.members.pull(targetUserId);
      room.mutedIds.pull(targetUserId);
      room.moderatorIds.pull(targetUserId);
      await room.save();
    }

    io.to(`room:${room.slug}`).emit('moderation:applied', {
      action,
      targetUserId,
      byUserId: String(req.user.userId),
    });
    res.json({ ok: true });
  });

  return router;
}

// Turn a room name into a url-safe, lowercased slug ("Cohort 7!" -> "cohort-7").
function slugify(name) {
  return String(name)
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80);
}
