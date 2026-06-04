import { Router } from 'express';
import { Room } from '../models/Room.js';
import { Pulse, PULSE_TYPES } from '../models/Pulse.js';

// Is the caller a member of (i.e. has joined) this room?
function isMember(room, userId) {
  return room.members.some((m) => m.equals(userId));
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
