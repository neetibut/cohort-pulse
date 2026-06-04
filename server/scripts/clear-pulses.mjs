// One-off maintenance script: empties the `pulses` collection.
// Usage (from the server/ directory, so dotenv finds .env):
//   node scripts/clear-pulses.mjs
import 'dotenv/config';
import mongoose from 'mongoose';
import { Pulse } from '../src/models/Pulse.js';

const uri = process.env.MONGODB_URI;
if (!uri) {
  console.error('MONGODB_URI is not set (run from the server/ directory).');
  process.exit(1);
}

await mongoose.connect(uri);
const before = await Pulse.countDocuments();
const { deletedCount } = await Pulse.deleteMany({});
const after = await Pulse.countDocuments();
console.log(`pulses before: ${before} · deleted: ${deletedCount} · after: ${after}`);
await mongoose.disconnect();
process.exit(0);
