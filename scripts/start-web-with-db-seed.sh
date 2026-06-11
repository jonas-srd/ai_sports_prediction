#!/bin/sh
set -eu

DB_PATH="${SQLITE_DB_PATH:-/app/data/world-cup.db}"
SEED_PATH="${SQLITE_SEED_DB_GZ_PATH:-/app/deploy/seed/world-cup.db.gz}"
OVERWRITE="${SQLITE_SEED_OVERWRITE:-0}"
DB_DIR="$(dirname "$DB_PATH")"
TMP_PATH="${DB_PATH}.seed-tmp"

mkdir -p "$DB_DIR"

if [ -f "$SEED_PATH" ] && { [ "$OVERWRITE" = "1" ] || [ ! -s "$DB_PATH" ]; }; then
  if [ "$OVERWRITE" = "1" ]; then
    echo "SQLITE_SEED_OVERWRITE=1 set. Replacing SQLite database at $DB_PATH from seed."
  else
    echo "No SQLite database found at $DB_PATH. Restoring seed database from $SEED_PATH."
  fi

  gzip -dc "$SEED_PATH" > "$TMP_PATH"
  mv "$TMP_PATH" "$DB_PATH"
else
  echo "Using existing SQLite database at $DB_PATH."
fi

exec npm run start:web
