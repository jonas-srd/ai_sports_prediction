# World Cup 2026 Paper Exports

This project can export paper-analysis datasets directly from the local SQLite benchmark database.

Run:

```bash
npm run benchmark:export
```

By default, files are written to:

```text
exports/
```

Use a custom output directory:

```bash
npm run benchmark:export -- --out-dir=exports/run-2026-06-10
```

## Files

The command writes:

```text
exports/worldcup2026_matches.csv
exports/worldcup2026_predictions_raw.csv
exports/worldcup2026_predictions_validated.csv
exports/worldcup2026_evaluations.csv
exports/worldcup2026_tool_logs.jsonl
```

## Contents

`worldcup2026_matches.csv` contains fixture metadata, stage information, kickoff time, team names, venue, source IDs, status, separated 90-minute/full-time/extra-time/penalty result fields, result winner, actual advancer, and match timestamps.

`worldcup2026_predictions_raw.csv` contains all benchmark prediction rows, including invalid/API-error rows. It includes experimental identity fields, model/provider metadata, timing metadata, prompt metadata, raw prompt, raw response, repair raw response, response metadata, cost/token metadata, and SHA-256 hashes for raw prompt/response fields.

`worldcup2026_predictions_validated.csv` contains all benchmark prediction rows with parsed prediction fields, validation status, validity flag, repair/normalization metadata, probability sums, tool-use metadata, hashes for raw prompt/response/tool trace, and timestamps. It does not drop invalid predictions.

`worldcup2026_evaluations.csv` is left-joined from predictions to evaluations. It includes every benchmark prediction row, with evaluation metrics populated when available and null otherwise.

`worldcup2026_tool_logs.jsonl` contains open-book/tool-enabled prediction records with tool-use metadata and raw tool traces where stored. Each line is one JSON object.

## Reproducibility Notes

The export command reads the database selected by `SQLITE_DB_PATH`, or `data/world-cup.db` when unset.

Recommended sequence before producing paper exports:

```bash
npm run sync:football-data
npm run benchmark:evaluate -- --all
npm run benchmark:export
```

The export intentionally includes invalid predictions and predictions without evaluations, so missingness, API errors, repair rates, normalization rates, and open-book search-observed rates can be analyzed directly.
