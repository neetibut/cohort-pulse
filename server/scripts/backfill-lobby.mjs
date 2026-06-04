// One-off v1->v2 migration: move any pre-v2 pulses (no roomId) into the lobby room,
// and backfill authorName from the legacy `author` string when missing. Idempotent.
// Run from the server/ directory: node scripts/backfill-lobby.mjs
import 'dotenv/config';
import mongoose from 'mongoose';
import { Pulse } from '../src/models/Pulse.js';
import { Room } from '../src/models/Room.js';
import { ensureLobby } from '../src/seed.js';

const uri = process.env.MONGODB_URI;
if (!uri) { console.error('MONGODB_URI is not set (run from server/).'); process.exit(1); }

await mongoose.connect(uri);
await ensureLobby();
const lobby = await Room.findOne({ slug: 'lobby' });
if (!lobby) { console.error('lobby room missing after ensureLobby()'); process.exit(1); }

const legacy = await Pulse.find({ roomId: { $exists: false } }).lean();
console.log(`legacy pulses without roomId: ${legacy.length}`);

let updated = 0;
for (const p of legacy) {
  const set = { roomId: lobby._id };
  if (!p.authorName) set.authorName = p.author || 'unknown';
  await Pulse.updateOne({ _id: p._id }, { $set: set });
  updated++;
}
console.log(`backfilled into lobby: ${updated}`);
await mongoose.disconnect();
process.exit(0);
