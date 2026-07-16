# Widget customer management

The authenticated cockpit at `/admin/customers` manages paid widget customers created by the
existing Stripe checkout and webhook flow.

## Capabilities

- Active, past-due, canceled and inactive customers
- Encrypted API-key reveal, immediate key rotation, blocking and reactivation
- Multiple allowed publisher domains with plan-specific limits
- Atomic monthly request metering and server-side quota enforcement
- Daily usage totals for the last 30 days
- Stripe invoice links and PDFs captured from invoice webhooks
- Minimum term, current billing period, automatic renewal and cancellation status
- Cancellation at the earliest contractually permitted date and cancellation withdrawal

Starter permits one domain and up to three matches per response. Growth permits five domains and
up to eight matches. Enterprise permits 25 domains and up to twelve matches. The per-customer
monthly request limit is stored in `widget_customers.monthly_limit` and can be adjusted in the
cockpit.

Each successful request to `/api/widgets/matches` or `/api/widgets/predictions` atomically consumes
one monthly request. Requests with an invalid key, inactive subscription, unapproved domain,
unavailable widget type or oversized response are rejected before usage is consumed. Once the
monthly allowance is exhausted, the API returns HTTP 429. Authorized responses use private,
no-store caching so CDN hits cannot bypass metering or expose one publisher's response to another.

## Deployment

Run the Postgres migrations before deploying the web application. Configure a long, stable
`WIDGET_API_KEY_ENCRYPTION_KEY`; if it is omitted, the admin-session secret is used. Existing API
keys that predate encrypted storage remain valid but cannot be revealed. Rotate each old key once
from the cockpit to make future authenticated reveal possible.
