import { User } from './models/User.js';
import { Room } from './models/Room.js';

// Ensure a default public "lobby" room exists (contract §4.2 / PRD §4.2). It needs
// an owner, so we also ensure a minimal system User to own it.
export async function ensureLobby() {
  if (await Room.exists({ slug: 'lobby' })) return;

  let system = await User.findOne({ displayName: 'System' });
  if (!system) system = await User.create({ displayName: 'System' });

  await Room.create({
    slug: 'lobby',
    name: 'Lobby',
    ownerId: system._id,
    isPrivate: false,
    members: [],
  });
  console.log('seeded default public room "lobby"');
}
