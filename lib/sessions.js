import crypto from 'crypto';

const sessions = new Map();

export function createSession(userName) {
  const token = crypto.randomBytes(24).toString('hex');
  sessions.set(token, userName.trim().toLowerCase());
  return token;
}

export function validateSession(token) {
  if (!token || typeof token !== 'string') return null;
  return sessions.get(token.trim());
}
