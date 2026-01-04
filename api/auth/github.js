const crypto = require('crypto');
const {
  STATE_COOKIE,
  getBaseUrl,
  buildCookie,
  logAuthError
} = require('./utils');

module.exports = async (req, res) => {
  const clientId = process.env.GITHUB_ID;
  if (!clientId) {
    logAuthError('Missing GITHUB_ID');
    res.statusCode = 500;
    res.end('Missing GITHUB_ID');
    return;
  }

  const state = crypto.randomBytes(16).toString('hex');
  const redirectUri = `${getBaseUrl(req)}/api/auth/callback/github`;
  const authUrl = new URL('https://github.com/login/oauth/authorize');
  authUrl.searchParams.set('client_id', clientId);
  authUrl.searchParams.set('redirect_uri', redirectUri);
  authUrl.searchParams.set('scope', 'read:user user:email');
  authUrl.searchParams.set('state', state);

  res.setHeader(
    'Set-Cookie',
    buildCookie(STATE_COOKIE, state, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'Lax',
      maxAge: 60 * 10
    })
  );

  res.writeHead(302, { Location: authUrl.toString() });
  res.end();
};
