# Railway Deployment

Deploy one Docker image as separate Railway services. Each service uses `SERVICE_ROLE` to select its runtime behavior.

## Services

```text
web      SERVICE_ROLE=web
api      SERVICE_ROLE=api
worker   SERVICE_ROLE=worker
migrate  SERVICE_ROLE=migrate
backup   SERVICE_ROLE=backup
```

Use the repository root as the service root for every service.

## Required Services

- Managed Postgres with snapshots and point-in-time recovery enabled.
- Managed Redis for BullMQ.
- Optional S3-compatible object storage for logical exports.

## Required Variables

```env
DATABASE_URL=postgres://...
DATABASE_SSL=1
REDIS_URL=redis://...
AI_SPORTS_API_URL=https://your-internal-api-url
FOOTBALL_DATA_API_KEY=your_key
FOOTBALL_DATA_COMPETITION=WC
FOOTBALL_DATA_SEASON=2026
OPENROUTER_API_KEY=your_key
OPENROUTER_SITE_NAME=AI Sports Prediction
OPENROUTER_SITE_URL=https://your-public-domain
ADMIN_API_TOKEN=long-random-token
```

## Optional Backup Variables

```env
POSTGRES_BACKUP_DIR=/app/data/postgres-backups
BACKUP_S3_BUCKET=
BACKUP_S3_PREFIX=ai-sports-prediction/backups
BACKUP_S3_REGION=
BACKUP_S3_ENDPOINT=
BACKUP_S3_FORCE_PATH_STYLE=0
```

## Database Migration

Run migrations explicitly, not from request handlers:

```bash
SERVICE_ROLE=migrate
```

or:

```bash
npm run db:migrate:postgres
```

## API

Health:

```text
/health
```

Read endpoints:

```text
/v1/matches
/v1/benchmark-predictions
/v1/special-predictions
```

Protected admin endpoint:

```text
/v1/admin/backups
```

Use:

```http
Authorization: Bearer <ADMIN_API_TOKEN>
```

## Worker

The worker listens to Redis queues:

```text
fixture-sync
predictions
scoring
backups
```

Workers write all attempts to `job_attempts`.

## Backups

Schedule a backup service:

```bash
SERVICE_ROLE=backup
```

or enqueue backups:

```bash
npm run queue:backup
```

The backup job writes a verified logical Postgres export, a manifest, and `backup_artifacts` / `backup_verifications` rows.
