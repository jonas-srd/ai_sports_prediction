# Editorial Outreach Agent

The outreach agent researches sports publishers and prepares personalized widget pitches for review. Discovery and sending are intentionally separate.

## Safety and legal boundary

A public email address is not permission to send advertising. In Germany, Section 7(2) UWG generally requires prior express consent for advertising by electronic mail. The existing-customer exception in Section 7(3) applies only when all listed conditions are met. See the official text: https://www.gesetze-im-internet.de/uwg_2004/__7.html

The workflow therefore enforces:

- only public role addresses such as `redaktion@`, `sport@`, or `partners@`; personal addresses are discarded;
- pages without a verified public role email are discarded before a prospect is stored;
- `robots.txt`, same-origin crawling, a descriptive user agent, request limits, and crawl delays;
- no recurring discovery job by default;
- drafts remain `pending_review` after discovery;
- sending supports exactly one draft at a time, not bulk campaigns;
- documented express consent or a documented, verified existing-customer exception;
- named human approval before sending;
- suppression and opt-out checks;
- a Postgres trigger that rejects attempts to bypass these checks.

This is a technical safeguard, not legal advice. Have the final process and consent wording reviewed for the countries in which outreach will run.

## Setup

Run the Postgres migrations and configure the outreach variables from `.env.example`. Discovery supports SerpApi and Brave Search; SerpApi is selected automatically when `SERPAPI_API_KEY` is present. The cockpit can enqueue separate searches for Germany, Austria, Switzerland, the United Kingdom, the United States, Canada, Australia, Spain, France, Italy, and the Netherlands. Search region and query language follow the selected country, while the draft language can independently be German, English, Spanish, French, Italian, or Dutch. Optional OpenRouter personalization creates tailored drafts. Without `OPENROUTER_API_KEY`, a localized factual template draft is created instead.

For delivery, use a Resend-verified domain you own. Do not configure a public mailbox domain such as Outlook as the Resend sender. Resend's domain setup requires SPF and DKIM; DMARC is also recommended.

## Workflow

1. Discover and research publishers:

   ```bash
   npm run outreach:discover
   ```

   If research succeeded but an optional personalization provider was unavailable, create factual fallback drafts from the already stored role contacts without running another web search:

   ```bash
   npm run outreach:backfill-drafts
   ```

2. Sign in once through `/admin/login` with an allowlisted email address and its authenticator code, then open `/admin/outreach`. The same protected admin session grants access to every agent cockpit; no separate browser token is required. Review the prospect, source URLs, contact, fit reasons, and draft. Independently verify that the recipient has opted in or that every condition of the existing-customer exception is met.

3. Record permission and human approval:

   ```bash
   npm run outreach:approve -- \
     DRAFT_ID \
     explicit_consent \
     "Consent form URL and timestamp or other concrete evidence" \
     "Reviewer name"
   ```

   `existing_customer_exception` is accepted only for a real customer relationship that has been checked against all requirements in Section 7(3) UWG. It is not a label for cold prospects.

4. Send one eligible draft:

   ```bash
   npm run outreach:send -- DRAFT_ID
   ```

The sender adds a reply-based opt-out notice and uses a stable idempotency key to prevent accidental duplicates.

The admin cockpit exposes the same guarded operations. Editing an approved draft revokes its approval. Rejecting a prospect suppresses it, and the UI enables the one-at-a-time send button only when permission evidence, human approval, and delivery configuration are all present.

## Queue jobs

The worker also recognizes these manually enqueued jobs on the `outreach` queue:

- `discover-editorial-prospects` with optional `{ "country": "FR", "searchLanguage": "fr", "emailLanguage": "fr" }`
- `send-approved-editorial-outreach` with `{ "draftId": "..." }`

Neither job is scheduled automatically. The send job performs the same permission and approval checks as the command-line path.
