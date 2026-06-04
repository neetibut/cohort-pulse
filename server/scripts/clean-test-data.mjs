// Reset the database to a pristine demo state: clears ALL pulses, deletes every
// room except `lobby`, resets lobby membership, and deletes every user except the
// lobby's System owner. Use after load testing / QA to clear throwaway data.
//
// SAFE BY DEFAULT: dry-run unless you pass CONFIRM=1.
//   node scripts/clean-test-data.mjs            # dry run — shows what WOULD be deleted
//   CONFIRM=1 node scripts/clean-test-data.mjs  # actually delete
//
// Run from the server/ directory so dotenv finds .env. Destructive — there is no undo.
import 'dotenv/config';
import mongoose from 'mongoose';
import { Pulse } from '../src/models/Pulse.js';
import { Room } from '../src/models/Room.js';
import { User } from '../src/models/User.js';
import { ensureLobby } from '../src/seed.js';

const CONFIRM = process.env.CONFIRM === '1';
const uri = process.env.MONGODB_URI;
if (!uri) { console.error('MONGODB_URI is not set (run from server/).'); process.exit(1); }

await mongoose.connect(uri);
await ensureLobby();                      // guarantees lobby + its System owner exist
const lobby = await Room.findOne({ slug: 'lobby' });
const keepUserId = lobby.ownerId;         // never delete the System user that owns lobby

const pulseCount = await Pulse.countDocuments();
const roomCount = await Room.countDocuments({ slug: { $ne: 'lobby' } });
const userCount = await User.countDocuments({ _id: { $ne: keepUserId } });

console.log(`\nplan: delete ${pulseCount} pulses, ${roomCount} non-lobby rooms, ${userCount} non-System users; reset lobby membership.`);

if (!CONFIRM) {
  console.log('DRY RUN — nothing deleted. Re-run with CONFIRM=1 to apply.\n');
  await mongoose.disconnect();
  process.exit(0);
}

const p = await Pulse.deleteMany({});
const r = await Room.deleteMany({ slug: { $ne: 'lobby' } });
lobby.members = []; lobby.moderatorIds = []; lobby.mutedIds = [];
await lobby.save();
const u = await User.deleteMany({ _id: { $ne: keepUserId } });

console.log(`deleted: pulses=${p.deletedCount}, rooms=${r.deletedCount}, users=${u.deletedCount}; lobby reset to empty.`);
const remainingRooms = await Room.find().select('slug').lean();
console.log(`rooms remaining: ${remainingRooms.map((x) => x.slug).join(', ') || '(none)'}\n`);
await mongoose.disconnect();
process.exit(0);
