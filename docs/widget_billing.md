# Widget billing

Starter and Growth use Stripe Checkout with SEPA Direct Debit. Both payment choices have the same contract structure:

- direct online purchase is restricted to business customers acting as entrepreneurs within the meaning of section 14 BGB;

- 12-month minimum term;
- monthly payment, or the first 12 months paid upfront for the price of 11 months;
- after the minimum term, automatic one-month renewals at the normal monthly price;
- cancellation can take effect at the end of any monthly renewal period after the minimum term.

The pricing page only selects the plan and billing interval. Customers then continue to the dedicated `/widgets/checkout` or `/de/widgets/checkout` page. That page collects the contact person, legal company name, publication, domain, access email, invoice email, complete billing address and optional VAT/tax ID before redirecting to Stripe.

## Stripe products and prices

Create four recurring EUR prices in Stripe and add their IDs to the matching environment variables:

- Starter monthly: 49 EUR, recurring monthly;
- Starter annual: 539 EUR, recurring yearly for the initial Checkout subscription;
- Growth monthly: 149 EUR, recurring monthly;
- Growth annual: 1,639 EUR, recurring yearly for the initial Checkout subscription.

The webhook converts an annual Checkout subscription to a schedule: the current annual phase runs to the end of the minimum term, one monthly phase follows, and the schedule then releases the subscription so it continues monthly. A monthly Checkout subscription already has the required billing interval and continues monthly after its contractual minimum term.

## Required setup

1. Apply Postgres migrations with `npm run db:migrate:postgres`.
2. Configure all `STRIPE_*` and `WIDGET_*` variables documented in `.env.example`.
3. Enable SEPA Direct Debit in Stripe and make sure every configured price is in EUR.
4. Activate Stripe Tax, configure the seller's German tax registration and assign the correct tax code to the widget products. Checkout requires the billing address, supports business tax IDs and calculates applicable VAT automatically.
5. Register `https://www.ai-sports-prediction.net/api/widgets/stripe/webhook` as a Stripe webhook endpoint.
6. Subscribe it to `checkout.session.completed`, `checkout.session.async_payment_succeeded`, `invoice.paid`, `invoice.payment_failed`, `customer.subscription.updated`, and `customer.subscription.deleted`.
7. Configure a Resend-verified sender in `WIDGET_ACCESS_FROM_EMAIL`.
8. Apply migration `0010_widget_invoice_details.sql` so invoice and contact details can be retained for customer support and invoice delivery.
9. Create a Stripe Customer Portal configuration for invoices, payment methods, billing address
   and tax IDs. Disable subscription cancellation and plan changes in that portal; set its ID in
   `STRIPE_CUSTOMER_PORTAL_CONFIGURATION_ID`.
10. In Stripe Revenue Recovery, enable Smart Retries and Stripe's payment-failure emails. The
    application additionally consumes `invoice.payment_failed`, marks the customer `past_due`,
    emails the account link and creates an internal, idempotent automation event.

Widget access is created only after `invoice.paid`. Payment failures mark access `past_due`; canceled or unpaid subscriptions are deactivated. Stripe webhook signatures and event IDs are verified to prevent forged or duplicate processing.

For every `invoice.paid` event, the billing email receives a localized message with links to Stripe's hosted invoice and invoice PDF. Stripe can additionally attach the PDF itself when finalized-invoice or successful-payment emails are enabled under **Settings → Billing → Subscriptions and emails**. Avoid enabling both email paths if duplicate invoice emails are not desired.

The cancellation interface must enforce the stored `minimum_term_ends_at_utc`. Do not expose unrestricted Stripe Customer Portal cancellation before that rule has been configured and tested.

The interface shows a highlighted contract summary immediately before Checkout, records the business-customer and minimum-term confirmations, and leaves the binding paid order to Stripe Checkout. Before production launch, have the full terms, privacy information, tax setup and cancellation process reviewed by German legal and tax professionals.
