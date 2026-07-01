#!/bin/sh
set -eu

ROLE="${SERVICE_ROLE:-web}"

case "$ROLE" in
  web)
    exec npm run start:web
    ;;
  api)
    exec npm run start:api
    ;;
  worker)
    exec npm run start:worker
    ;;
  migrate)
    exec npm run db:migrate:postgres
    ;;
  backup)
    exec npm run backup:postgres
    ;;
  *)
    echo "Unknown SERVICE_ROLE=$ROLE. Expected web, api, worker, migrate, or backup." >&2
    exit 1
    ;;
esac
