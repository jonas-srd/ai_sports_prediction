# World Cup LLM Rank

Local-first 48h MVP for a Kicktipp-style website that compares football score predictions from eight LLMs.

The project uses a local SQLite database by default to avoid cloud database overhead.

## Architecture

```text
.
+-- apps/
|   +-- web/              # Next.js dashboard for localhost and optional Vercel hosting
|   +-- cron/             # Local scripts for fetching, predicting, and scoring
+-- packages/
|   +-- db/               # SQLite schema and repository helpers
|   +-- llm/              # OpenRouter client, prompt builder, model config
|   +-- scorer/           # Kicktipp-style points logic
+-- data/                 # Local SQLite DB and sample fixtures
+-- package.json          # npm workspaces root
+-- tsconfig.base.json    # shared TypeScript config
```

## Local Data Flow

```text
football-data.org -> data/world-cup.db -> LLM predictions -> scores -> website
```

1. Fetch World Cup matches from football-data.org into SQLite.
2. Run the prediction script once per match day.
3. Store all LLM predictions in SQLite.
4. Sync results again after matches finish.
5. Run scoring.
6. The local website reads from SQLite and shows the ranking.

## Setup

```bash
npm install
copy .env.example .env
```

Fill in `.env`:

```text
FOOTBALL_DATA_API_KEY=your_football_data_key
FOOTBALL_DATA_COMPETITION=WC
FOOTBALL_DATA_SEASON=2026
OPENROUTER_API_KEY=your_openrouter_key
SQLITE_DB_PATH=
```

Leave `SQLITE_DB_PATH` empty to use:

```text
data/world-cup.db
```

Never commit `.env`. It is ignored by git and must stay local/private.

## Local Commands

Initialize the local SQLite DB:

```bash
npm run db:init
```

Fetch all World Cup fixtures/results from football-data.org:

```bash
npm run sync:football-data
```

Optional API-Football fallback for historical smoke tests:

```bash
npm run sync:api-football -- --season=2022
```

Run daily predictions for today's matches:

```bash
npm run predict
```

Score finished matches:

```bash
npm run score
```

Start the local website:

```bash
npm run dev
```

Open:

```text
http://localhost:3000
```

## Scoring

```text
4 points: exact result
3 points: correct goal difference
2 points: correct tendency
0 points: miss
```

## football-data.org

The primary World Cup sync uses football-data.org:

```text
GET https://api.football-data.org/v4/competitions/WC/matches
Query: season=2026
Header: X-Auth-Token: FOOTBALL_DATA_API_KEY
```

The API key is only used in local server-side scripts under `apps/cron`. Do not expose it through frontend code or a `NEXT_PUBLIC_` variable.

## Public Deployment Later

SQLite is good for the local MVP. For a public Vercel deployment, keep this limitation in mind:

```text
Vercel can read files deployed with the app, but it should not be used as a persistent writable SQLite host.
```

Pragmatic public options later:

1. Keep using SQLite locally, export static JSON, and deploy the read-only website.
2. Move the same DB repository layer to a hosted SQL database when automatic public updates matter.
3. Use a small VPS if you want SQLite plus a public writable server.

## Apps And Packages

- `apps/web`: Next.js dashboard. Reads `data/world-cup.db` locally when available, otherwise shows sample data.
- `apps/cron/src/jobs/init-db.ts`: creates the local SQLite database and tables.
- `apps/cron/src/jobs/sync-football-data.ts`: fetches World Cup fixtures/results from football-data.org into SQLite.
- `apps/cron/src/jobs/sync-api-football.ts`: optional API-Football fallback for historical smoke tests.
- `apps/cron/src/jobs/predict-today.ts`: loads today's matches, calls OpenRouter, stores predictions.
- `apps/cron/src/jobs/score-results.ts`: scores finished matches using Kicktipp rules.
- `packages/db`: SQLite connection, schema, and repository helpers.
- `packages/llm`: model IDs, prompt construction, and OpenRouter calls.
- `packages/scorer`: shared points logic.
