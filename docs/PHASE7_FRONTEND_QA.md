# Phase 7 Frontend QA

Run these checks after deploying or in a local Node environment.

## Automated

```bash
npm run typecheck
npm run test:analytics
npm run build
```

## Manual UI Checks

1. Open `/` and verify the hero, scoring rules, current leader, leaderboard, model drilldown, and latest matches still render.
2. Open `/matches`, expand multiple match cards, and verify benchmark fields appear: 90-minute score, probabilities, horizon, access condition, prompt strategy, validation status, points, and open-book search indicator.
3. Open `/tournament-tree` and expand bracket cards to verify the existing bracket layout, flags, and prediction expansion still work.
4. Open `/analytics` with no benchmark predictions and verify the empty state is shown without errors.
5. Open `/analytics` with benchmark predictions and verify filters affect both charts and table.
6. Switch between higher-is-better and lower-is-better metrics and verify ranking order changes correctly.
7. Select an open-book slice and verify `observed_search` rows show the search-observed indicator.
8. Confirm invalid predictions are excluded from performance metrics but included in invalid-output, repair, and normalization-rate metrics.
9. Confirm pending or null evaluation metrics do not break charts or table rendering.
10. Click a bar or table row and verify the selected model/configuration is highlighted; clear the highlight afterward.
