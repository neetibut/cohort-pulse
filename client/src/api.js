// Thin REST client. Every call below maps 1:1 to a row in docs/contract.md §3.
// All paths are under /api; everything except createSession sends Authorization: Bearer.
import { API_URL } from './config.js';

// Thrown on a non-2xx response so callers can surface the server's { error } message
// and inspect the status (e.g. 401 -> bounce to sign-in, 403 -> bad access code).
export class ApiError extends Error {
  constructor(message, status) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
  }
}

async function request(path, { method = 'GET', body, token } = {}) {
  const headers = {};
  if (body !== undefined) headers['content-type'] = 'application/json';
  if (token) headers.authorization = `Bearer ${token}`;

  const res = await fetch(`${API_URL}/api${path}`, {
    method,
    headers,
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });

  // Error shape is always { error: <message> } per §3.
  if (!res.ok) {
    let message = `Request failed (${res.status})`;
    try {
      const data = await res.json();
      if (data?.error) message = data.error;
    } catch {
      /* non-JSON error body — keep the generic message */
    }
    throw new ApiError(message, res.status);
  }
  if (res.status === 204) return null;
  return res.json();
}

export const api = {
  // POST /auth/session { displayName } -> 201 { token, user }
  createSession: (displayName) =>
    request('/auth/session', { method: 'POST', body: { displayName } }),

  // GET /rooms -> Room[] (public + joined)
  listRooms: (token) => request('/rooms', { token }),

  // POST /rooms { name, isPrivate, accessCode? } -> Room
  createRoom: (token, { name, isPrivate, accessCode }) =>
    request('/rooms', { method: 'POST', token, body: { name, isPrivate, accessCode } }),

  // POST /rooms/:slug/join { accessCode? } -> { room, membership }
  joinRoom: (token, slug, accessCode) =>
    request(`/rooms/${slug}/join`, { method: 'POST', token, body: { accessCode } }),

  // GET /rooms/:slug/pulses -> Pulse[] (<=50, pinned first then newest)
  getPulses: (token, slug) => request(`/rooms/${slug}/pulses`, { token }),

  // POST /rooms/:slug/pulses { type, text } -> Pulse (also emits pulse:new)
  postPulse: (token, slug, { type, text }) =>
    request(`/rooms/${slug}/pulses`, { method: 'POST', token, body: { type, text } }),

  // DELETE /rooms/:slug/pulses/:id -> { ok: true }
  deletePulse: (token, slug, id) =>
    request(`/rooms/${slug}/pulses/${id}`, { method: 'DELETE', token }),

  // POST /rooms/:slug/pulses/:id/pin { pinned } -> Pulse
  pinPulse: (token, slug, id, pinned) =>
    request(`/rooms/${slug}/pulses/${id}/pin`, { method: 'POST', token, body: { pinned } }),

  // POST /rooms/:slug/moderate { action, targetUserId } -> { ok: true }
  moderate: (token, slug, { action, targetUserId }) =>
    request(`/rooms/${slug}/moderate`, { method: 'POST', token, body: { action, targetUserId } }),
};
