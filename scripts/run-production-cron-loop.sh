#!/bin/sh
set -u

INTERVAL_SECONDS="${INTERNAL_CRON_INTERVAL_SECONDS:-900}"

run_job() {
  echo "[$(date -u)] Starting: $*"
  "$@"
  STATUS=$?

  if [ "$STATUS" -eq 0 ]; then
    echo "[$(date -u)] Finished: $*"
  else
    echo "[$(date -u)] Failed with exit code $STATUS: $*"
  fi
}

echo "Starting internal production cron loop with interval ${INTERVAL_SECONDS}s."

while true; do
  run_job npm run sync:football-data

  run_job npm run benchmark:predict:due -- --horizon=T_2H --window-before-min=15 --window-after-min=180 --concurrency=3
  run_job npm run benchmark:predict:due -- --horizon=T_24H --window-before-min=30 --window-after-min=720 --concurrency=3

  run_job npm run benchmark:predict:stage-opening -- --stage=group_stage --concurrency=3
  run_job npm run benchmark:predict:stage-opening -- --stage=round_of_32 --concurrency=3
  run_job npm run benchmark:predict:stage-opening -- --stage=round_of_16 --concurrency=3
  run_job npm run benchmark:predict:stage-opening -- --stage=quarterfinal --concurrency=3
  run_job npm run benchmark:predict:stage-opening -- --stage=semifinal --concurrency=3
  run_job npm run benchmark:predict:stage-opening -- --stage=third_place --concurrency=3
  run_job npm run benchmark:predict:stage-opening -- --stage=final --concurrency=3

  run_job npm run benchmark:predict:due -- --horizon=T_2H --window-before-min=15 --window-after-min=180 --concurrency=3
  run_job npm run benchmark:predict:due -- --horizon=T_24H --window-before-min=30 --window-after-min=720 --concurrency=3

  run_job npm run benchmark:evaluate

  run_job npm run backup:db

  echo "[$(date -u)] Cron loop sleeping ${INTERVAL_SECONDS}s."
  sleep "$INTERVAL_SECONDS"
done
