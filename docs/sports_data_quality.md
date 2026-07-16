# Sports data quality gate

All public TheSportsDB match snapshots pass through one fail-closed quality gate before they reach the homepage, sport pages, widget search, widget previews or embedded widgets.

## Blocking rules

- Every event must carry the configured allowlisted league ID.
- The provider competition name must exactly match the configured competition name or an explicit alias.
- Provider sport metadata must match the requested sport when present.
- NBA and NFL participants must match their canonical franchise allowlists.
- DFB-Pokal is accepted only as league ID `4485` with the configured DFB-Pokal identity.
- UEFA Champions League is accepted only as league ID `4480`; qualifiers, preliminary rounds, play-offs and June-to-August qualification fixtures are excluded from the main competition.
- Football, NBA and NFL matches require real remote HTTPS team logos. Generated data URIs, local fallback graphics and known placeholder URLs are rejected.
- Tennis matches require automatically resolved FlagCDN country flags for both players. New
  players are resolved from the local catalogue, TheSportsDB and structured Wikimedia data.
  Remaining names are matched only against official ITF player profiles through the configured
  SerpApi key. Successful profiles are stored in Postgres and cached for 30 days, so deployments
  and server restarts do not repeat the same lookups. Unresolved names are retried later.
- Missing or identical participant names are rejected.

Rejected matches are not replaced with sample teams, initials or generated logos.

## Admin report

Authenticated administrators can open `/admin/data-quality`. The page scans every configured competition, shows the exact league-ID allowlist, counts checked, published and quarantined matches, and lists every blocking reason. The backing endpoint `/api/admin/data-quality` requires the same signed authenticator session as the other agent cockpits.

The report is deliberately live rather than a cached marketing metric: refreshing it reruns the same validation path used by public match snapshots.

## Verification

Run:

```bash
node --import tsx --test \
  apps/web/src/lib/sports-data-quality.test.ts \
  apps/web/src/lib/widget-logos.test.ts
```
