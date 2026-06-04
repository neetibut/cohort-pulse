import { Router } from 'express';
import { Pulse, PULSE_TYPES } from '../models/Pulse.js';

export function pulsesRouter(io) {
  const router = Router();

  // GET /api/pulses -> last 50 pulses, newest first.
  router.get('/', async (req, res) => {
    const pulses = await Pulse.find().sort({ createdAt: -1 }).limit(50).lean();
    res.json(pulses);
  });

  // POST /api/pulses -> validate, save the truth, then broadcast the news.
  router.post('/', async (req, res) => {
    const { author, type, text } = req.body ?? {};
    if (!author || !type || !text) {
      return res.status(400).json({ error: 'author, type and text are required' });
    }
    if (!PULSE_TYPES.includes(type)) {
      return res.status(400).json({ error: `type must be one of ${PULSE_TYPES.join(', ')}` });
    }

    const pulse = await Pulse.create({ author, type, text });
    io.emit('pulse:new', pulse); // emit only after the save succeeds
    res.status(201).json(pulse);
  });

  return router;
}
