const crypto = require('crypto');

const SESSION_COOKIE = 'ariyo_session';
const STATE_COOKIE = 'ariyo_oauth_state';

function getBaseUrl(req) {
  const configuredUrl = process.env.NEXTAUTH_URL;
  if (configuredUrl) {
    return configuredUrl.replace(/\/$/, '');
  }
  const protocol = req.headers['x-forwarded-proto'] || 'http';
  return `${protocol}://${req.headers.host}`;
}

function getSecret() {
  return process.env.NEXTAUTH_SECRET || 'ariyo-dev-secret';
}

function logAuthError(message, details) {
  if (process.env.NODE_ENV === 'production') return;
  if (details) {
    console.warn(`[auth] ${message}`, details);
    return;
  }
  console.warn(`[auth] ${message}`);
}

function sign(value) {
  const hmac = crypto.createHmac('sha256', getSecret());
  hmac.update(value);
  return hmac.digest('hex');
}

function timingSafeEqual(a, b) {
  const bufferA = Buffer.from(a);
  const bufferB = Buffer.from(b);
  if (bufferA.length !== bufferB.length) return false;
  return crypto.timingSafeEqual(bufferA, bufferB);
}

function encodeSession(session) {
  const payload = Buffer.from(JSON.stringify(session)).toString('base64url');
  return `${payload}.${sign(payload)}`;
}

function decodeSession(token) {
  if (!token) return null;
  const [payload, signature] = token.split('.');
  if (!payload || !signature) return null;
  if (!timingSafeEqual(signature, sign(payload))) return null;
  try {
    return JSON.parse(Buffer.from(payload, 'base64url').toString('utf8'));
  } catch (error) {
    return null;
  }
}

function parseCookies(req) {
  const header = req.headers.cookie || '';
  return header.split(';').reduce((acc, part) => {
    const [key, ...rest] = part.trim().split('=');
    if (!key) return acc;
    acc[key] = decodeURIComponent(rest.join('='));
    return acc;
  }, {});
}

function buildCookie(name, value, options = {}) {
  const parts = [`${name}=${encodeURIComponent(value)}`];
  if (options.maxAge) parts.push(`Max-Age=${options.maxAge}`);
  if (options.expires) parts.push(`Expires=${options.expires.toUTCString()}`);
  if (options.httpOnly) parts.push('HttpOnly');
  if (options.secure) parts.push('Secure');
  if (options.sameSite) parts.push(`SameSite=${options.sameSite}`);
  parts.push(`Path=${options.path || '/'}`);
  return parts.join('; ');
}

function clearCookie(name) {
  return buildCookie(name, '', { expires: new Date(0), path: '/' });
}

module.exports = {
  SESSION_COOKIE,
  STATE_COOKIE,
  getBaseUrl,
  encodeSession,
  decodeSession,
  parseCookies,
  buildCookie,
  clearCookie,
  logAuthError
};
