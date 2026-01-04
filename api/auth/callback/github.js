const {
  SESSION_COOKIE,
  STATE_COOKIE,
  getBaseUrl,
  encodeSession,
  parseCookies,
  buildCookie,
  clearCookie,
  logAuthError
} = require('../utils');

async function exchangeCode(code, redirectUri) {
  const response = await fetch('https://github.com/login/oauth/access_token', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Accept: 'application/json'
    },
    body: JSON.stringify({
      client_id: process.env.GITHUB_ID,
      client_secret: process.env.GITHUB_SECRET,
      code,
      redirect_uri: redirectUri
    })
  });

  if (!response.ok) {
    logAuthError('GitHub token exchange failed', {
      status: response.status,
      statusText: response.statusText
    });
  }

  return response.json();
}

async function fetchGitHubUser(token) {
  const response = await fetch('https://api.github.com/user', {
    headers: {
      Authorization: `Bearer ${token}`,
      'User-Agent': 'Ariyo-AI'
    }
  });

  if (!response.ok) {
    logAuthError('GitHub user fetch failed', {
      status: response.status,
      statusText: response.statusText
    });
  }

  return response.json();
}

module.exports = async (req, res) => {
  const { code, state } = req.query;
  const cookies = parseCookies(req);
  const storedState = cookies[STATE_COOKIE];

  if (!code || !state || state !== storedState) {
    logAuthError('Invalid OAuth state', { hasCode: Boolean(code), hasState: Boolean(state) });
    res.statusCode = 400;
    res.end('Invalid OAuth state');
    return;
  }

  const redirectUri = `${getBaseUrl(req)}/api/auth/callback/github`;
  const tokenResponse = await exchangeCode(code, redirectUri);

  if (!tokenResponse.access_token) {
    logAuthError('Missing access token from GitHub');
    res.statusCode = 401;
    res.end('Unable to authenticate with GitHub');
    return;
  }

  const user = await fetchGitHubUser(tokenResponse.access_token);
  const session = {
    id: user.id,
    login: user.login,
    avatar: user.avatar_url,
    name: user.name || user.login,
    provider: 'github',
    createdAt: new Date().toISOString()
  };

  const sessionCookie = buildCookie(SESSION_COOKIE, encodeSession(session), {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'Lax',
    maxAge: 60 * 60 * 12
  });

  res.setHeader('Set-Cookie', [sessionCookie, clearCookie(STATE_COOKIE)]);
  res.writeHead(302, { Location: '/crew/' });
  res.end();
};
