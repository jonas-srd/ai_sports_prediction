# World Cup LLM Rank

Local-first 48h MVP for a Kicktipp-style website that compares football score predictions from eight LLMs.

The project uses a local SQLite database by default to avoid cloud database overhead.

## Architecture

```text
.
+-- apps/
|   +-- web/              # Next.js dashboard for localhost and Railway hosting
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
OPENROUTER_TEST_MODEL=openai/gpt-4o
OPENROUTER_MODEL_IDS=
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

Check that OpenRouter works:

```bash
npm run openrouter:smoke
```

List currently free OpenRouter models:

```bash
npm run openrouter:list-free
```

Run daily predictions for today's matches:

```bash
npm run predict
```

Run predictions for the next scheduled match if there are no matches today:

```bash
npm run predict:next
```

Limit the number of upcoming matches:

```bash
npm run predict:next -- --limit=3
```

Score finished matches:

```bash
npm run score
```

Recalculate all existing finished-match scores after changing the scoring system:

```bash
npm run score -- --all
```

Export paper-analysis datasets for the World Cup 2026 benchmark:

```bash
npm run benchmark:export
```

This writes:

```text
exports/worldcup2026_matches.csv
exports/worldcup2026_predictions_raw.csv
exports/worldcup2026_predictions_validated.csv
exports/worldcup2026_evaluations.csv
exports/worldcup2026_tool_logs.jsonl
```

The exports include invalid benchmark predictions and unevaluated rows. See `docs/worldcup2026_paper_exports.md`.

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
5 points: exact result
2 points: correct goal difference
1 point: correct tendency
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

## OpenRouter

OpenRouter is used as the single LLM gateway:

```text
POST https://openrouter.ai/api/v1/chat/completions
Header: Authorization: Bearer OPENROUTER_API_KEY
```

The default project setup uses eight models from `packages/llm/src/models.ts`.

To override the model list without editing code, set comma-separated OpenRouter model IDs:

```text
OPENROUTER_MODEL_IDS=openrouter/owl-alpha,nex-agi/nex-n2-pro:free,moonshotai/kimi-k2.6:free
```

For a cheap first test, set only one model:

```text
OPENROUTER_MODEL_IDS=meta-llama/llama-3.2-3b-instruct
```

The mainstream 8-model setup uses paid OpenRouter models and requires credits:

```text
OPENROUTER_MODEL_IDS=openai/gpt-4o,anthropic/claude-sonnet-4.5,google/gemini-3.5-flash,x-ai/grok-4.20,mistralai/mistral-large,deepseek/deepseek-r1,perplexity/sonar-pro,meta-llama/llama-3.2-3b-instruct
```

## Public Deployment

SQLite is good for the local MVP. For a public Railway deployment, keep this limitation in mind:

```text
Railway can run the app, but the local SQLite file should not be treated as durable production storage unless it is backed by a persistent volume.
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
- `apps/cron/src/jobs/openrouter-smoke-test.ts`: checks the OpenRouter API key with one model.
- `apps/cron/src/jobs/openrouter-list-free-models.ts`: lists currently free OpenRouter text models.
- `apps/cron/src/jobs/predict-today.ts`: loads today's matches, calls OpenRouter, stores predictions.
- `apps/cron/src/jobs/predict-next.ts`: predicts the next scheduled matches for local testing.
- `apps/cron/src/jobs/score-results.ts`: scores finished matches using Kicktipp rules.
- `apps/cron/src/jobs/export-worldcup2026-paper-data.ts`: exports paper-analysis CSV/JSONL datasets.
- `packages/db`: SQLite connection, schema, and repository helpers.
- `packages/llm`: model IDs, prompt construction, and OpenRouter calls.
- `packages/scorer`: shared points logic.
