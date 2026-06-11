import mongoose from 'mongoose';

export async function connectDb(uri) {
  if (!uri) throw new Error('MONGODB_URI is not set');
  mongoose.set('strictQuery', true);
  console.log('connecting to MongoDB…');
  try {
    // Fail fast (5s) instead of the 30s default so a bad connection surfaces quickly.
    await mongoose.connect(uri, { serverSelectionTimeoutMS: 5000 });
    console.log('mongodb connected');
  } catch (err) {
    console.error('\n✖ Could not reach MongoDB Atlas. The three usual causes:');
    console.error('  1. MONGODB_URI in server/.env is wrong (password must be URL-encoded)');
    console.error('  2. Atlas Network Access allowlist does not include 0.0.0.0/0');
    console.error('  3. The Atlas cluster is paused — resume it in the Atlas dashboard');
    console.error(`\n  (${String(err.message).split('\n')[0]})\n`);
    throw err;
  }
}
