const { sql } = require('@vercel/postgres');

const DEFAULT_BRAND_VAULT = {
  voice:
    'Warm, Lagos-rooted, and future-focused. Mix crisp professionalism with Afro-optimism and a steady, friendly cadence.',
  bio:
    'Àríyò AI blends Nigerian music discovery, storytelling, and AI-powered cultural experiences. We also serve ETL-GIS Consulting LLC for enterprise GIS automation and public-sector AI enablement.',
  services:
    'Ariyo AI: PWA music/radio experiences, cultural storytelling, AI companions. ETL-GIS Consulting LLC: GIS data pipelines, automation, analytics dashboards, public-sector AI modernization.',
  audience:
    'Naija and diaspora listeners, creative technologists, public-sector leaders, civic innovators, and enterprise GIS teams.',
  ctas:
    'https://ariyo.ai | https://etl-gis.com | https://twitter.com/ariyo_ai',
  hashtags:
    '#AriyoAI #NaijaTech #GISAutomation #PublicSectorAI #AfroInnovation #MusicTech',
  tone: 'Confident, concise, and celebratory with clear next steps.'
};

async function ensureSchema() {
  await sql.query(`
    CREATE TABLE IF NOT EXISTS brand_vault (
      id SERIAL PRIMARY KEY,
      voice TEXT,
      bio TEXT,
      services TEXT,
      audience TEXT,
      ctas TEXT,
      hashtags TEXT,
      tone TEXT,
      updated_at TIMESTAMPTZ DEFAULT NOW()
    );
  `);

  await sql.query(`
    CREATE TABLE IF NOT EXISTS crew_runs (
      id SERIAL PRIMARY KEY,
      agent TEXT NOT NULL,
      goal TEXT NOT NULL,
      context TEXT,
      output_markdown TEXT,
      output_json JSONB,
      status TEXT NOT NULL,
      created_at TIMESTAMPTZ DEFAULT NOW()
    );
  `);
}

async function getBrandVault() {
  await ensureSchema();
  const { rows } = await sql.query('SELECT * FROM brand_vault ORDER BY updated_at DESC LIMIT 1');
  if (rows.length) return rows[0];

  const insert = await sql.query(
    `INSERT INTO brand_vault (voice, bio, services, audience, ctas, hashtags, tone)
     VALUES ($1, $2, $3, $4, $5, $6, $7)
     RETURNING *`,
    [
      DEFAULT_BRAND_VAULT.voice,
      DEFAULT_BRAND_VAULT.bio,
      DEFAULT_BRAND_VAULT.services,
      DEFAULT_BRAND_VAULT.audience,
      DEFAULT_BRAND_VAULT.ctas,
      DEFAULT_BRAND_VAULT.hashtags,
      DEFAULT_BRAND_VAULT.tone
    ]
  );
  return insert.rows[0];
}

async function saveBrandVault(payload) {
  await ensureSchema();
  const { rows } = await sql.query(
    `INSERT INTO brand_vault (voice, bio, services, audience, ctas, hashtags, tone)
     VALUES ($1, $2, $3, $4, $5, $6, $7)
     RETURNING *`,
    [payload.voice, payload.bio, payload.services, payload.audience, payload.ctas, payload.hashtags, payload.tone]
  );
  return rows[0];
}

module.exports = {
  DEFAULT_BRAND_VAULT,
  ensureSchema,
  getBrandVault,
  saveBrandVault
};
