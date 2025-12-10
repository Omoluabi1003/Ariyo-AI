const webPush = require('web-push');
const { readSubscriptions, removeSubscriptionsByEndpoint } = require('../push/store');

function requireAuth(req) {
  const token = process.env.NOTIFICATION_API_TOKEN;
  if (!token) return false;
  const header = req.headers?.authorization || '';
  return header === `Bearer ${token}`;
}

async function parseBody(req) {
  if (req.body) {
    return req.body;
  }
  const chunks = [];
  for await (const chunk of req) {
    chunks.push(chunk);
  }
  const raw = Buffer.concat(chunks).toString('utf8');
  if (!raw) return null;
  try {
    return JSON.parse(raw);
  } catch (error) {
    return null;
  }
}

function configureWebPush() {
  const publicKey = process.env.VAPID_PUBLIC_KEY;
  const privateKey = process.env.VAPID_PRIVATE_KEY;
  const subject = process.env.VAPID_SUBJECT || 'mailto:admin@example.com';

  if (!publicKey || !privateKey) {
    throw new Error('Missing VAPID keys in environment.');
  }

  webPush.setVapidDetails(subject, publicKey, privateKey);
}

module.exports = async (req, res) => {
  if (req.method !== 'POST') {
    res.statusCode = 405;
    res.setHeader('Allow', 'POST');
    res.end('Method Not Allowed');
    return;
  }

  if (!requireAuth(req)) {
    res.statusCode = 401;
    res.end('Unauthorized');
    return;
  }

  let body;
  try {
    body = await parseBody(req);
  } catch (error) {
    body = null;
  }

  const payload = {
    title: body?.title || 'New Drop on Àríyò AI',
    body: body?.body || 'A fresh track just landed. Tap to listen.',
    url: body?.url || '/new-drop',
  };

  let subscriptions;
  try {
    configureWebPush();
    subscriptions = await readSubscriptions();
  } catch (error) {
    console.error('Notify setup failed', error);
    res.statusCode = 500;
    res.end('Push service not configured.');
    return;
  }

  const invalidEndpoints = new Set();

  await Promise.all(subscriptions.map(async (subscription) => {
    try {
      await webPush.sendNotification(subscription, JSON.stringify(payload));
    } catch (error) {
      if (error.statusCode === 410 || error.statusCode === 404) {
        invalidEndpoints.add(subscription.endpoint);
      } else {
        console.error('Push send failed', error);
      }
    }
  }));

  if (invalidEndpoints.size > 0) {
    await removeSubscriptionsByEndpoint(Array.from(invalidEndpoints));
  }

  res.statusCode = 200;
  res.setHeader('Content-Type', 'application/json');
  res.end(JSON.stringify({
    sent: subscriptions.length,
    invalidated: invalidEndpoints.size,
  }));
};
