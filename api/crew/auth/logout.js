const { clearCookie, SESSION_COOKIE } = require('../auth-utils');

module.exports = async (req, res) => {
  res.setHeader('Set-Cookie', clearCookie(SESSION_COOKIE));
  res.writeHead(302, { Location: '/crew/' });
  res.end();
};
