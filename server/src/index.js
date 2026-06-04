import 'dotenv/config';
import express from 'express';
import cors from 'cors';

const app = express();
app.use(cors());
app.use(express.json());

// Health check — keep this working through every checkpoint.
app.get('/health', (req, res) => res.json({ ok: true }));

// ── Live build goes here ─────────────────────────────────────────────
// During the session you'll add: MongoDB connection, the Pulse model,
// GET/POST /api/pulses, the Socket.IO server, the Redis adapter, and presence.
// See docs/architecture.md.
// ─────────────────────────────────────────────────────────────────────

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => console.log(`server listening on :${PORT}`));
