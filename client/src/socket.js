import { io } from 'socket.io-client';
import { API_URL } from './config.js';

// Unlike v1 (which connected at module load), v2 connects lazily AFTER sign-in so the
// JWT can ride along on the handshake — per contract §2/§4: io(URL, { auth: { token } }).
// One socket instance per app lifetime; we (re)create it on sign-in and tear it down
// on sign-out so a fresh token is always used.
let socket = null;

export function connectSocket(token) {
  if (socket) socket.disconnect();
  socket = io(API_URL, { auth: { token }, autoConnect: true });
  return socket;
}

export function getSocket() {
  return socket;
}

export function disconnectSocket() {
  if (socket) {
    socket.disconnect();
    socket = null;
  }
}
