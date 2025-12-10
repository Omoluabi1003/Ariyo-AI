module.exports = async (req, res) => {
  if (req.method !== 'GET') {
    res.statusCode = 405;
    res.setHeader('Allow', 'GET');
    res.end('Method Not Allowed');
    return;
  }

  const publicKey = process.env.VAPID_PUBLIC_KEY;
  if (!publicKey) {
    res.statusCode = 503;
    res.end('VAPID public key not configured.');
    return;
  }

  res.setHeader('Content-Type', 'application/json');
  res.statusCode = 200;
  res.end(JSON.stringify({ publicKey }));
};
