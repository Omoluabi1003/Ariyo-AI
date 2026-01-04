const { sql } = require('@vercel/postgres');
const { ensureSchema } = require('./db');
const { SESSION_COOKIE, decodeSession, parseCookies } = require('../auth/utils');

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
  await ensureSchema();

  const { agent, q, limit } = req.query;
  const conditions = [];
  const values = [];

  if (agent) {
    values.push(agent);
    conditions.push(`agent = $${values.length}`);
  }

  if (q) {
    values.push(`%${q}%`);
    const idx = values.length;
    conditions.push(`(goal ILIKE $${idx} OR context ILIKE $${idx} OR output_markdown ILIKE $${idx})`);
  }

  const whereClause = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';
  const limitValue = Number(limit) || 50;

  const query = `
    SELECT id, agent, goal, context, status, created_at
    FROM crew_runs
    ${whereClause}
    ORDER BY created_at DESC
    LIMIT ${Math.min(limitValue, 200)}
  `;

  const { rows } = await sql.query(query, values);

  res.setHeader('Content-Type', 'application/json');
  res.end(JSON.stringify({ runs: rows }));
};
