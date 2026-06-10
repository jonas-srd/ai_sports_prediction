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

## Commands

The web service starts with:

```bash
npm run start:web
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
