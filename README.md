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
OPENROUTER_TEST_MODEL=openai/gpt-5.5
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

Run benchmark predictions for all known group-stage matches with resumable skipping:

```bash
npm run benchmark:predict -- --group-stage --skip-existing --concurrency=3
```

Useful benchmark prediction filters:

```bash
npm run benchmark:predict -- --group-stage --access=closed_book --skip-existing --concurrency=5
npm run benchmark:predict -- --group-stage --access=open_book --skip-existing --concurrency=2
npm run benchmark:predict -- --group-stage --prompt-strategy=direct_score --skip-existing --concurrency=3
```

`--skip-existing` skips already valid predictions and retries invalid/API-error rows. Use `--skip-any-existing` only when you want to preserve every existing row regardless of validity.

Run production benchmark prediction schedulers:

```bash
npm run benchmark:predict:due -- --horizon=T_2H --window-before-min=15 --window-after-min=180 --concurrency=3
npm run benchmark:predict:due -- --horizon=T_24H --window-before-min=30 --window-after-min=720 --concurrency=3
npm run benchmark:predict:stage-opening -- --stage=group_stage --concurrency=3
npm run benchmark:predict:stage-opening -- --stage=round_of_16 --concurrency=3
```

The due runner selects matches whose target prediction time is inside the polling window. The horizon remains kickoff minus 24 hours for `T_24H` and kickoff minus 2 hours for `T_2H`; the polling interval is only how often the job is invoked. Wider after-windows are used in production to fill late predictions instead of leaving empty cells after deploy delays or long model runs. Timing metadata still records whether a prediction was on time or late. The stage-opening runner refuses partial stages and runs only after the full group stage or knockout round is known. Both jobs skip valid existing predictions by default, fill missing/invalid rows, and use a DB-backed scheduler lock.

Recommended production cadence:

```text
fixture sync: every 15-60 minutes, depending on provider limits
T_2H due runner: every 15 minutes, before longer jobs
T_24H due runner: every 15 minutes
stage-opening runner: manually, or scheduled shortly after official stage/round completion
scoring/evaluation: after result sync
```

Run the one-time pre-tournament Kicktipp special-question predictions:

```bash
npm run special:predict -- --concurrency=2
```

This generates the 15 tournament-level questions once for the same active model roster and the same 2x2 `closed_book`/`open_book` x `direct_score`/`probabilistic_forecast` strategy design. The special predictions use the existing initial horizon name `STAGE_OPENING`; no `T_24H` or `T_2H` special predictions are generated.

Special prediction rerun behavior:

```bash
npm run special:predict -- --access=closed_book --concurrency=3
npm run special:predict -- --question=world_champion,semifinalists --model=openai/gpt-5.5
npm run special:predict -- --force
```

By default, valid existing special predictions are skipped and failed/invalid rows are retried. Use `--force` to overwrite valid rows, or `--skip-any-existing` to preserve every existing row. The special-question prompt context is built only from fixture and group data; it must not read match predictions, prior special predictions, evaluations, analytics, scores, or tournament-tree outputs.

Validate special-question definitions, JSON validation, and storage:

```bash
npm run test:special
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

Create a compressed SQLite backup. By default this writes one backup per UTC day and skips if today's backup already exists:

```bash
npm run backup:db
```

Force a second backup for the same UTC day:

```bash
npm run backup:db -- --force
```

Local backups are written next to the SQLite database under `data/backups` unless `SQLITE_BACKUP_DIR` is set.

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

The MVP default uses the minimal flagship benchmark models from `packages/llm/src/models.ts`.

To override the active subset without editing code, set comma-separated OpenRouter model IDs from `FULL_BENCHMARK_MODELS`:

```text
OPENROUTER_MODEL_IDS=openai/gpt-5.5,anthropic/claude-opus-4.8
```

For a single-model smoke test, set only one model:

```text
OPENROUTER_MODEL_IDS=mistralai/mistral-large-2512
```

Benchmark prediction calls default to the same completion ceiling for first attempts, validation retries, and JSON repair calls:

```text
OPENROUTER_BENCHMARK_MAX_COMPLETION_TOKENS=5000
OPENROUTER_BENCHMARK_RETRY_MAX_COMPLETION_TOKENS=5000
OPENROUTER_BENCHMARK_REPAIR_MAX_COMPLETION_TOKENS=5000
```

Leave these unset to use the same 5000-token defaults. Increase them only if a model still returns truncated JSON.

The minimal flagship MVP setup uses paid OpenRouter models and requires credits:

```text
OPENROUTER_MODEL_IDS=openai/gpt-5.5,anthropic/claude-opus-4.8,anthropic/claude-fable-5,google/gemini-3.1-pro-preview,x-ai/grok-4.3,deepseek/deepseek-v4-pro,qwen/qwen3.7-max,mistralai/mistral-large-2512
```

## Railway Deployment

The production Railway setup uses a single web service with one persistent SQLite volume. The web app reads the database and the internal cron loop writes updates into the same SQLite file.

Do not run a separate Railway cron service with a separate volume for SQLite. Two services with two volumes will create two different database files, so web will not display cron updates.

Required Railway service setup:

```text
Service: @llm-kicktipp/web
Volume mount: /app/data
Custom Start Command: sh scripts/start-web-with-db-seed.sh
Replicas: 1
```

Recommended Railway env vars:

```text
SQLITE_DB_PATH=/app/data/world-cup.db
SQLITE_SEED_OVERWRITE=0
ENABLE_INTERNAL_CRON=1
FOOTBALL_DATA_API_KEY=...
FOOTBALL_DATA_COMPETITION=WC
FOOTBALL_DATA_SEASON=2026
OPENROUTER_API_KEY=...
OPENROUTER_SITE_URL=https://your-railway-domain.example
OPENROUTER_SITE_NAME=World Cup LLM Rank
BACKUP_DOWNLOAD_TOKEN=use-a-long-random-secret
```

Optional Railway env vars:

```text
INTERNAL_CRON_INTERVAL_SECONDS=900
SQLITE_BACKUP_DIR=/app/data/backups
```

`ENABLE_INTERNAL_CRON=1` starts `scripts/run-production-cron-loop.sh` in the background before Next.js starts. The loop runs:

```text
fixture/result sync
T_2H due predictions
T_24H due predictions
stage-opening prediction checks
second T_2H/T_24H due pass after stage-opening checks
benchmark evaluation
daily SQLite backup
```

The due prediction jobs select only matches whose target prediction time is inside their polling windows. Stage-opening jobs are safe to run repeatedly because they refuse partial stages and skip valid existing predictions.

### Seeding Railway SQLite

The Docker image contains `deploy/seed/world-cup.db.gz`. On startup, `scripts/start-web-with-db-seed.sh` restores this seed only when `/app/data/world-cup.db` is missing, unless forced.

To update Railway from a local database:

1. Rebuild `deploy/seed/world-cup.db.gz` from local `data/world-cup.db`.
2. Commit and deploy the new seed.
3. Temporarily set:

```text
ENABLE_INTERNAL_CRON=0
SQLITE_SEED_OVERWRITE=1
```

4. Redeploy or restart once. Logs should show:

```text
SQLITE_SEED_OVERWRITE=1 set. Replacing SQLite database at /app/data/world-cup.db from seed.
```

5. Immediately restore normal settings:

```text
ENABLE_INTERNAL_CRON=1
SQLITE_SEED_OVERWRITE=0
```

Never leave `SQLITE_SEED_OVERWRITE=1` enabled permanently. It would replace cron-generated data on every restart.

### Railway Backups

The internal cron loop runs:

```bash
npm run backup:db
```

This creates one compressed SQLite backup per UTC day in:

```text
/app/data/backups
```

Backups are stored as:

```text
world-cup-YYYY-MM-DDTHH-MM-SS-sssZ.db.gz
```

The backup script uses SQLite's backup API before compression, so it is safer than copying `world-cup.db` directly while WAL mode is active.

List available backups through the protected API:

```bash
curl -H "Authorization: Bearer YOUR_BACKUP_DOWNLOAD_TOKEN" \
  https://YOUR_RAILWAY_DOMAIN/api/admin/backups
```

Download one backup:

```bash
curl -H "Authorization: Bearer YOUR_BACKUP_DOWNLOAD_TOKEN" \
  https://YOUR_RAILWAY_DOMAIN/api/admin/backups/world-cup-2026-06-11T03-00-00-000Z.db.gz \
  -o world-cup-backup.db.gz
```

Replace the local `data/world-cup.db` with the newest host backup:

```env
WORLD_CUP_HOST_URL=https://YOUR_RAILWAY_DOMAIN
BACKUP_DOWNLOAD_TOKEN=YOUR_BACKUP_DOWNLOAD_TOKEN
```

Then run:

```powershell
npm run db:download-host
```

For a one-off run without editing `.env`:

```powershell
$env:WORLD_CUP_HOST_URL="https://YOUR_RAILWAY_DOMAIN"
$env:BACKUP_DOWNLOAD_TOKEN="YOUR_BACKUP_DOWNLOAD_TOKEN"
npm run db:download-host
```

The script saves the current local database under `data/backups` before replacing it. Stop `npm run dev` or any SQLite browser before running it so the local database file is not locked.

`BACKUP_DOWNLOAD_TOKEN` must be set or the backup routes return `401`.

For paper work, keep the downloaded `.db.gz` files outside Railway as well, for example in institutional storage, cloud storage, or a local archive. The Railway volume is the operational source of truth, not the only archive.

### Paper Exports On Railway

Paper CSV/JSONL exports can be generated manually from the Railway shell:

```bash
npm run benchmark:export -- --out-dir=/app/data/exports/latest
```

These files are derived artifacts. The SQLite backups are the primary research backup because they contain the full raw prompts, raw responses, validations, evaluations, and scheduler state.

### Longer-Term Options

Pragmatic options if SQLite becomes limiting:

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
- `apps/cron/src/jobs/backup-sqlite-db.ts`: creates daily compressed SQLite backups.
- `packages/db`: SQLite connection, schema, and repository helpers.
- `packages/llm`: model IDs, prompt construction, and OpenRouter calls.
- `packages/scorer`: shared points logic.
