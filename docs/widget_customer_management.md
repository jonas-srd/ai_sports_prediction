# Widget customer management

The authenticated cockpit at `/admin/customers` manages paid widget customers created by the
existing Stripe checkout and webhook flow. Customers use the passwordless self-service area at
`/widgets/account` or `/de/widgets/account`.

## Capabilities

- Active, past-due, canceled and inactive customers
- Encrypted API-key reveal, immediate key rotation, blocking and reactivation
- Multiple allowed publisher domains with plan-specific limits
- Atomic monthly request metering and server-side quota enforcement
- Daily usage totals for the last 30 days
- Stripe invoice links and PDFs captured from invoice webhooks
- Minimum term, current billing period, automatic renewal and cancellation status
- Cancellation at the earliest contractually permitted date and cancellation withdrawal
- Passwordless, single-use customer sign-in links
- Customer-managed API-key rotation, domains, usage and invoice downloads
- Stripe Customer Portal handoff for payment method, invoice address and VAT-ID changes
- Lead pipeline and automated checkout, onboarding, usage, domain and payment follow-up

Starter permits two domains and up to three matches per response. Growth permits eight domains and
up to eight matches. Enterprise permits 25 domains and up to twelve matches. The per-customer
monthly request limit is stored in `widget_customers.monthly_limit` and can be adjusted in the
cockpit.

The Stripe Customer Portal configuration must not permit plan changes or subscription
cancellation. Contractual cancellation is implemented in the first-party account so the minimum
term and the next permitted effective date remain enforceable.

Revenue automation deliberately contains no reminder about an approaching contract end or
cancellation opportunity. It only sends operational messages for an abandoned checkout after 24
hours, missing initial integration, 70/90 percent quota thresholds, a suitable Growth upgrade,
repeated domain failures and failed payments.

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

Also configure `WIDGET_CUSTOMER_SESSION_SECRET`, `STRIPE_CUSTOMER_PORTAL_CONFIGURATION_ID`,
`PUBLIC_SITE_URL`, `REVENUE_AUTOMATION_ENABLED`, `SALES_ALERT_EMAILS`, Redis and the verified
`WIDGET_ACCESS_FROM_EMAIL`. Migration `0014_revenue_operations.sql` adds the passwordless login,
lead pipeline, server-side revenue events and idempotent automation records.
