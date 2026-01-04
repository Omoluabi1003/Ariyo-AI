const { getBrandVault, saveBrandVault } = require('./db');
const { SESSION_COOKIE, decodeSession, parseCookies } = require('./auth-utils');

function requireAuth(req, res) {
  const cookies = parseCookies(req);
  const session = decodeSession(cookies[SESSION_COOKIE]);
  if (!session) {
    res.statusCode = 401;
    res.end('Unauthorized');
    return null;
  }
  return session;
}

module.exports = async (req, res) => {
  if (!requireAuth(req, res)) return;

  if (req.method === 'GET') {
    const vault = await getBrandVault();
    res.setHeader('Content-Type', 'application/json');
    res.end(JSON.stringify({ vault }));
    return;
  }

  if (req.method === 'POST') {
    let body = '';
    req.on('data', chunk => {
      body += chunk;
    });
    req.on('end', async () => {
      const payload = JSON.parse(body || '{}');
      const saved = await saveBrandVault(payload);
      res.setHeader('Content-Type', 'application/json');
      res.end(JSON.stringify({ vault: saved }));
    });
    return;
  }

  res.statusCode = 405;
  res.end('Method not allowed');
};
