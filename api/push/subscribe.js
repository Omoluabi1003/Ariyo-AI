const { saveSubscription } = require('./store');

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

module.exports = async (req, res) => {
  if (req.method !== 'POST') {
    res.statusCode = 405;
    res.setHeader('Allow', 'POST');
    res.end('Method Not Allowed');
    return;
  }

  const subscription = await parseBody(req);
  if (!subscription || !subscription.endpoint) {
    res.statusCode = 400;
    res.end('Invalid subscription payload.');
    return;
  }

  try {
    await saveSubscription(subscription);
    res.statusCode = 201;
    res.setHeader('Content-Type', 'application/json');
    res.end(JSON.stringify({ status: 'ok' }));
  } catch (error) {
    console.error('Failed to persist subscription', error);
    res.statusCode = 500;
    res.end('Failed to persist subscription.');
  }
};
