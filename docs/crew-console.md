# Crew Console

Crew Console adds a multi-agent AI workflow hub to Àríyò AI. It ships as static pages under `/crew/` backed by Vercel serverless functions and Postgres persistence.

## Architecture overview

- **UI**: Static pages (`/crew/index.html`, `/crew/run/index.html`, `/crew/history/index.html`, `/crew/vault/index.html`) with shared styling in `crew/crew.css` and shared logic in `crew/crew.js`.
- **API**: Vercel serverless functions in `api/crew/`.
  - `api/crew/run.js` streams agent output and persists runs.
  - `api/crew/history.js` lists run history with search/filter.
  - `api/crew/vault.js` stores Brand Vault settings.
  - `api/crew/auth/*` handles GitHub OAuth and sessions.
- **Data**: `@vercel/postgres` tables.
  - `brand_vault`: voice, bio, services, audience, ctas, hashtags, tone.
  - `crew_runs`: agent, goal, context, output_markdown, output_json, status.

## Required environment variables

Set these in `.env.local` for local dev or in Vercel project settings:

```
OPENAI_API_KEY=sk-...
OPENAI_MODEL=gpt-4o-mini
POSTGRES_URL=postgres://...
GITHUB_CLIENT_ID=...
GITHUB_CLIENT_SECRET=...
CREW_SESSION_SECRET=long-random-string
```

> `OPENAI_MODEL` is optional; defaults to `gpt-4o-mini`.

## Database setup

The serverless functions auto-create tables on first request. For a manual setup, run:

```
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
```

## Manual test plan

1. **Auth gate**
   - Visit `/crew/` and confirm the GitHub sign-in gate appears.
   - Sign in and confirm the roster renders.
2. **Brand Vault**
   - Navigate to `/crew/vault/`, update fields, save, and refresh to confirm persistence.
3. **Run console**
   - Go to `/crew/run/`, select an agent, enter a goal, and run the workflow.
   - Confirm streaming tokens appear and deliverables populate.
4. **Run history**
   - Visit `/crew/history/` to ensure the run appears and search/filter works.
5. **Export actions**
   - Use copy, download, and JSON export buttons to validate outputs.

## Notes

- Crew Console does not auto-post to external platforms in v1.
- Brand Vault defaults are seeded on first use, aligned with Ariyo AI + ETL-GIS Consulting LLC.
