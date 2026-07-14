# AI Sport Prediction

AI Sport Prediction compares football forecasts from multiple AI models and stores prediction data as durable research data.

## Architecture

```text
apps/web      Next.js frontend
apps/api      dedicated HTTP API backed by Postgres
apps/worker   queue-backed jobs, migrations, exports, backup verification

packages/db      Postgres client, migrations, API repository helpers
packages/llm     model configuration, prompts, OpenRouter access
packages/scorer  deterministic scoring logic
```

Postgres is the production source of truth.

## Setup

```bash
npm install
cp .env.example .env
```

Required production variables:

```text
DATABASE_URL=
REDIS_URL=
OPENROUTER_API_KEY=
OPENROUTER_MODEL_IDS=openai/gpt-oss-20b:free
FOOTBALL_DATA_API_KEY=
AI_SPORTS_API_URL=
ADMIN_API_TOKEN=
RESEND_API_KEY=
NEWSLETTER_FROM_EMAIL="AI Sports Prediction <ai-sports-prediction@outlook.com>"
API_CACHE_ENABLED=1
WEB_API_CACHE_SECONDS=60
```

## Commands

```bash
npm run dev
npm run dev:api
npm run start:worker
npm run db:migrate:postgres
npm run backup:postgres
npm run queue:backup
npm run typecheck
```

## Deployment Roles

The Docker image is role-based:

```text
SERVICE_ROLE=web
SERVICE_ROLE=api
SERVICE_ROLE=worker
SERVICE_ROLE=migrate
SERVICE_ROLE=backup
```

Use separate services for worker, migration, and scheduled backup. For the
public web/API edge, the current deployment path is Cloudflare Tunnel on ECS.
See `docs/CLOUDFLARE_TUNNEL.md` and `docs/AWS_ECS_FARGATE.md`.

## Backups

Production backups use:

- managed Postgres snapshots and point-in-time recovery;
- verified logical Postgres exports;
- optional S3-compatible object storage;
- `backup_artifacts` and `backup_verifications` audit rows.

Run:

```bash
npm run backup:postgres
```

See `docs/backup_and_restore.md`.

## Documentation

- `docs/stable_backend_architecture.md`
- `docs/backup_and_restore.md`
- `docs/AWS_ECS_FARGATE.md`
- `docs/CLOUDFLARE_TUNNEL.md`
- `docs/RAILWAY.md`
- `docs/worldcup2026_benchmark_protocol.md`
