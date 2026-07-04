# AI Sport Prediction Stable Backend Architecture

## Goal

AI Sport Prediction treats prediction data as durable research data. Deployments, failed jobs, provider outages, and broken backups must not erase fixtures, prompts, raw model responses, predictions, evaluations, or audit metadata.

## Target Architecture

```text
apps/web  ->  apps/api  ->  Postgres

apps/worker  ->  Redis/BullMQ queues  ->  Postgres
             ->  sports data providers
             ->  model providers
             ->  verified export storage
```

## Components

- `apps/web`: frontend only. It reads through the API and never opens database files.
- `apps/api`: HTTP API backed by Postgres.
- `apps/worker`: migrations, queues, job attempts, prediction/scoring work, logical exports, backup verification.
- `packages/db`: Postgres client, migrations, and production repository helpers.
- `packages/llm`: model configuration, prompts, provider access.
- `packages/scorer`: deterministic scoring logic.

## Database Decision

Postgres is the only database implementation in this rebuild.

## Database Rules

- Postgres is the source of truth.
- Migrations run explicitly through `SERVICE_ROLE=migrate` or `npm run db:migrate:postgres`.
- API and workers use Postgres only.
- Public API should use least-privilege credentials where possible.
- Worker writes must be idempotent and audited.

## Job Rules

Every job attempt stores:

- queue name;
- job name;
- idempotency key;
- payload hash;
- status;
- attempt count;
- timestamps;
- provider response id when available;
- error details on failure.

## Backup Rules

Use three layers:

1. Managed Postgres snapshots and PITR.
2. Verified logical exports.
3. Optional immutable/versioned object storage.

Backups are recorded in `backup_artifacts` and `backup_verifications`.

## Production Commands

```bash
npm run db:migrate:postgres
npm run start:api
npm run start:worker
npm run backup:postgres
npm run queue:backup
```

## Cutover Runbook

1. Create managed Postgres and Redis.
2. Set `DATABASE_URL`, `REDIS_URL`, API URL, and backup variables.
3. Run `npm run db:migrate:postgres`.
4. Run `npm run backup:postgres`.
5. Start API with `SERVICE_ROLE=api`.
6. Start worker with `SERVICE_ROLE=worker`.
7. Start web with `SERVICE_ROLE=web`.
