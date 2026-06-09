# World Cup LLM Rank

48h MVP for a Kicktipp-style website that compares daily football score predictions from eight LLMs.

## Architecture

```text
.
+-- apps/
|   +-- web/              # Next.js dashboard and API routes
|   +-- cron/             # Daily prediction and scoring jobs
+-- packages/
|   +-- db/               # Supabase client, repository helpers, shared DB types
|   +-- llm/              # OpenRouter client, prompt builder, model config
|   +-- scorer/           # Kicktipp-style points logic
+-- data/                 # Sample fixtures for local MVP work
+-- supabase/             # SQL schema for Supabase
+-- package.json          # npm workspaces root
+-- tsconfig.base.json    # shared TypeScript config
```

## MVP Flow

1. Store upcoming matches in Supabase `matches`.
2. Run the prediction job once per day.
3. The job prompts all active LLMs via OpenRouter and stores predictions.
4. After results are available, run the scoring job.
5. The dashboard shows ranking, match predictions, and points.

## Setup

```bash
npm install
copy .env.example .env
```

Fill in `.env`:

```text
OPENROUTER_API_KEY=
SUPABASE_URL=
SUPABASE_SERVICE_ROLE_KEY=
```

Create the database tables by running `supabase/schema.sql` in the Supabase SQL editor.

## Public Deployment

Use Vercel for the public website. Deploy only `apps/web`; the web app is self-contained for hosting, while the cron and shared packages can remain in the repo for backend work.

Recommended Vercel settings:

```text
Framework Preset: Next.js
Root Directory: apps/web
Install Command: npm install
Build Command: npm run build
Output Directory: leave empty / default
```

Steps:

1. Push this repository to GitHub.
2. Import the GitHub repository in Vercel.
3. Set the root directory to `apps/web`.
4. Add the environment variables from `.env.example` in Vercel Project Settings.
5. Deploy.

After deployment Vercel gives you a public URL like:

```text
https://your-project-name.vercel.app
```

## Commands

```bash
npm run dev
npm run seed:fixtures
npm run sync:football-data
npm run predict
npm run score
npm run typecheck
```

## Apps And Packages

- `apps/web`: Next.js dashboard with sample data until Supabase API routes are wired.
- `apps/cron/src/jobs/seed-sample-fixtures.ts`: seeds Supabase from `data/fixtures.sample.json`.
- `apps/cron/src/jobs/sync-football-data.ts`: optional fixture/result sync via football-data.org.
- `apps/cron/src/jobs/predict-today.ts`: loads today's matches, calls OpenRouter, stores predictions.
- `apps/cron/src/jobs/score-results.ts`: scores finished matches using Kicktipp rules.
- `packages/llm`: central place for model IDs, prompt construction, and OpenRouter calls.
- `packages/db`: Supabase service client and DB helper functions.
- `packages/scorer`: exact result = 4, goal difference = 3, tendency = 2, miss = 0.

## 48h Priority

1. Connect Supabase and run `supabase/schema.sql`.
2. Seed a few matches with `npm run seed:fixtures` or sync them with `npm run sync:football-data`.
3. Run `npm run predict`.
4. Add or sync real results to `matches`.
5. Run `npm run score`.
6. Replace sample dashboard data with DB-backed API routes.
