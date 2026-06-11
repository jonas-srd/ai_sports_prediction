# Railway Deployment

This project is deployed as one Docker-backed Railway service.

## Railway Service

Use the repository root as the service root. Railway should detect the root `Dockerfile`.

Required environment variables:

```env
SQLITE_DB_PATH=/app/data/world-cup.db
FOOTBALL_DATA_API_KEY=your_key
FOOTBALL_DATA_COMPETITION=WC
FOOTBALL_DATA_SEASON=2026
OPENROUTER_API_KEY=your_key
OPENROUTER_SITE_NAME=World Cup LLM Rank
OPENROUTER_SITE_URL=https://your-railway-domain
```

Optional environment variables:

```env
OPENROUTER_MODEL_IDS=
OPENROUTER_TEST_MODEL=openai/gpt-5.5
API_FOOTBALL_KEY=
API_FOOTBALL_LEAGUE_ID=1
API_FOOTBALL_SEASON=2026
SQLITE_SEED_OVERWRITE=0
```

## Volume

Add a Railway volume to the service and mount it at:

```text
/app/data
```

The SQLite database will live at:

```text
/app/data/world-cup.db
```

Do not store the database inside the container filesystem. It must be on the mounted volume to survive redeploys.

## Initial Database Seed

The Docker image can include a compressed seed database at:

```text
/app/deploy/seed/world-cup.db.gz
```

On container start, `scripts/start-web-with-db-seed.sh` restores that seed into:

```text
$SQLITE_DB_PATH
```

By default, this only happens when the target database file does not exist or is empty.

If the current Railway volume database should be replaced once, set this Railway variable for one deploy:

```env
SQLITE_SEED_OVERWRITE=1
```

After the seeded deploy is running, remove `SQLITE_SEED_OVERWRITE` or set it back to `0`. Otherwise every restart or redeploy will reset the volume database back to the packaged seed.

To refresh the packaged seed from the current local database:

```bash
python -c "import gzip, shutil; from pathlib import Path; Path('deploy/seed').mkdir(parents=True, exist_ok=True); shutil.copyfileobj(open('data/world-cup.db','rb'), gzip.open('deploy/seed/world-cup.db.gz','wb'))"
```

## Commands

The web service starts with:

```bash
sh scripts/start-web-with-db-seed.sh
```

Useful one-off commands to run from the Railway shell:

```bash
npm run db:init
npm run db:status
npm run sync:football-data
npm run predict:next
npm run score
```

The health endpoint is:

```text
/api/health
```
