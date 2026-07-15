# Marketing agent

The marketing agent turns stored, upcoming predictions into platform-specific campaign drafts. It follows five separated stages:

1. **Scout** selects upcoming predictions above the configured confidence threshold and avoids duplicate campaigns.
2. **Copy agent** uses the existing OpenRouter connection to create English Instagram, X, Reddit, and TikTok copy. English is enforced for both model output and the deterministic fallback.
3. **Visual agent** renders JPEG assets for Instagram feed (1080×1080), Instagram Story (1080×1920), landscape social posts (1200×675), and a clean TikTok photo (1080×1350).
4. **Compliance agent** rejects guaranteed-win, risk-free, or direct betting language and enforces the AI-prediction disclosure and platform length limits.
5. **Publisher** can publish approved posts to the owned Instagram and X accounts, only to explicitly allowlisted subreddits, and upload an editable TikTok photo draft.
6. **Performance agent** collects reach, impressions, clicks, reactions, comments, shares, and saves when the platform exposes them. It stores snapshots and produces evidence-based optimization recommendations.

## Safe default

`MARKETING_PUBLISH_MODE=review` is the default. Generation writes `pending_review` campaigns and posts to Postgres. A database trigger blocks publishing unless both the campaign and its posts have approval metadata.

Apply migrations and generate drafts:

```bash
npm run db:migrate:postgres
npm run marketing:generate
```

Approve and publish one reviewed campaign:

```bash
npm run marketing:approve -- <campaign-id> <reviewer>
npm run marketing:publish -- <campaign-id>
```

If credentials or a provider temporarily fail, run the same approve command again after fixing the configuration. Only failed posts are re-approved; posts that were already published are not duplicated.

Rejected drafts can be closed with:

```bash
npm run marketing:reject -- <campaign-id> <reviewer>
```

## Automation

Set `MARKETING_AUTOMATION_ENABLED=1` for the worker to create campaigns on the configured interval. It still produces review drafts while `MARKETING_PUBLISH_MODE=review`.

`MARKETING_PUBLISH_MODE=auto` is an explicit opt-in. In this mode, newly generated campaigns are approved as `marketing-agent:auto` and immediately sent to all configured publishers. Test every platform in review mode before enabling it.

Set `MARKETING_ANALYTICS_ENABLED=1` to collect new performance snapshots on an interval. Run a single analysis manually with:

```bash
npm run marketing:analyze
```

X supplies impressions and, with user-context access, URL clicks. Instagram supplies media insights such as reach, views, interactions, shares, and saves depending on media type and account permissions. Reddit exposes score and comment activity but not a dependable reach/click metric through the standard endpoint; those values remain empty rather than being estimated.

## Platform setup

### Instagram

Configure an Instagram professional account, its publishing token, and `MARKETING_PUBLIC_ASSET_BASE_URL`. The public base must expose the files from `MARKETING_ASSET_DIR` through HTTPS because Meta fetches the image from the supplied URL. For separate production containers, configure `MARKETING_ASSET_S3_*`; the worker then uploads every generated JPEG to the matching S3-compatible bucket and prefix. Stories require an Instagram Business account.

### X

Configure an OAuth user access token with permissions to create posts and upload media. The generated landscape JPEG is uploaded and attached to the post. The request marks the post as AI-generated.

### Reddit

Configure an OAuth refresh token with the `submit` scope. `MARKETING_REDDIT_SUBREDDITS` is a strict allowlist. Community rules, self-promotion policies, and posting frequency must be reviewed before adding a subreddit. The agent creates discussion-oriented text posts and never discovers target communities automatically.

### TikTok

Configure a TikTok developer app with the Content Posting API and `TIKTOK_ACCESS_TOKEN`. The safe default `TIKTOK_POST_MODE=MEDIA_UPLOAD` uploads the generated photo as an editable draft. The public asset domain must be verified in the TikTok developer portal and must match `MARKETING_PUBLIC_ASSET_BASE_URL`. Use `DIRECT_POST` only after TikTok has approved the app for `video.publish`; the configured creator privacy level is checked before posting.

## Environment variables

All supported variables and safe defaults are documented in `.env.example`. Credentials belong in `.env`, the deployment secret store, or AWS Secrets Manager—not in source control.
