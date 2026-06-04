// Lightweight identity storage. The JWT (and the user payload it carries) lives in
// localStorage so a returning visitor keeps the same stable userId — per contract §4.1,
// identity persists by the client reusing the stored token, not server-side dedupe.
const TOKEN_KEY = 'cp.token';
const USER_KEY = 'cp.user';

export function loadSession() {
  const token = localStorage.getItem(TOKEN_KEY);
  const rawUser = localStorage.getItem(USER_KEY);
  if (!token || !rawUser) return null;
  try {
    return { token, user: JSON.parse(rawUser) };
  } catch {
    return null;
  }
}

export function saveSession({ token, user }) {
  localStorage.setItem(TOKEN_KEY, token);
  localStorage.setItem(USER_KEY, JSON.stringify(user));
}

export function clearSession() {
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(USER_KEY);
}
