# Backup And Restore

## Production Target

Production data lives in managed Postgres.

## Backup Layers

1. Managed Postgres snapshots.
2. Point-in-time recovery.
3. Verified logical exports created by `apps/worker`.
4. Optional S3-compatible immutable/versioned storage.

## Logical Export

Run:

```bash
npm run backup:postgres
```

This creates a compressed JSONL export under `POSTGRES_BACKUP_DIR`, verifies that it can be decompressed and parsed, writes a manifest, and records audit rows in:

```text
backup_artifacts
backup_verifications
```

If `BACKUP_S3_BUCKET` is set, the export is uploaded to object storage.

## Manual Verification

```bash
npm run verify:postgres-backup --workspace @ai-sports-prediction/worker -- exports/postgres-backups/<file>.jsonl.gz
```

## Restore Drill

Run restore drills during active tournament periods:

1. Restore a managed Postgres snapshot or PITR target into a temporary database.
2. Apply migrations.
3. Import or inspect the latest logical export.
4. Check row counts for `matches`, `benchmark_predictions`, `prediction_evaluations`, `special_predictions`, and `backup_artifacts`.
5. Point API at the temporary database and call `/health`.
6. Record the drill result.

## Data Loss Rules

- Never disable managed snapshots or point-in-time recovery in production.
- Never treat a backup as valid without restore verification.
- Never run destructive migration steps without a fresh verified backup.
- Never delete the only backup for a day.
