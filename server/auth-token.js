const crypto = require('crypto');
const { isProduction } = require('./env');

function getSecret() {
  if (process.env.ADMIN_SECRET) return process.env.ADMIN_SECRET;
  if (isProduction()) {
    throw new Error('ADMIN_SECRET environment variable is required in production.');
  }
  return process.env.ADMIN_PASSWORD || 'JackStyle2026-dev-only';
}

function signToken(payload) {
  const body = Buffer.from(JSON.stringify(payload)).toString('base64url');
  const sig = crypto.createHmac('sha256', getSecret()).update(body).digest('base64url');
  return body + '.' + sig;
}

function verifyToken(token) {
  if (!token || token.indexOf('.') === -1) return null;
  const dot = token.lastIndexOf('.');
  const body = token.slice(0, dot);
  const sig = token.slice(dot + 1);
  const expected = crypto.createHmac('sha256', getSecret()).update(body).digest('base64url');
  if (sig.length !== expected.length) return null;
  if (!crypto.timingSafeEqual(Buffer.from(sig), Buffer.from(expected))) return null;
  try {
    const payload = JSON.parse(Buffer.from(body, 'base64url').toString('utf8'));
    if (!payload.exp || payload.exp < Date.now()) return null;
    return payload;
  } catch (e) {
    return null;
  }
}

function createSession(username) {
  return signToken({ username: username, exp: Date.now() + 43200000 });
}

module.exports = { createSession, verifyToken, getSecret };
