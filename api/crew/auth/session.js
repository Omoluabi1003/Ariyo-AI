const { SESSION_COOKIE, decodeSession, parseCookies } = require('../auth-utils');

module.exports = async (req, res) => {
  const cookies = parseCookies(req);
  const token = cookies[SESSION_COOKIE];
  const session = decodeSession(token);

  if (!session) {
    res.statusCode = 401;
    res.end('Not authenticated');
    return;
  }

  res.setHeader('Content-Type', 'application/json');
  res.end(JSON.stringify({ session }));
};
