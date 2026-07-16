# Widget sales launch checklist

This checklist is an implementation aid, not a substitute for review by a
German lawyer and tax adviser. Direct paid checkout remains blocked until the
mandatory configuration flags are complete.

## 1. Legal identity

- Add the full serviceable street address to `LEGAL_SELLER_STREET`.
- Confirm whether Jonas Schröder contracts as a sole trader and whether any
  commercial-register or professional information must be added.
- Confirm the contact email and update the legal notice with the exact same
  identity.
- Obtain legal review of the widget terms, privacy notice and DPA before
  setting `WIDGET_DIRECT_SALES_ENABLED=1`.

## 2. Tax treatment

- The tax adviser must choose `WIDGET_TAX_MODE=standard` or
  `WIDGET_TAX_MODE=small_business`.
- Add the seller VAT ID or tax number required on invoices.
- For standard taxation, configure the business origin and registrations in
  Stripe Tax, the account tax ID, the SaaS/product tax code and `exclusive`
  price tax behaviour. Only then set `STRIPE_TAX_READY=1`.
- Cross-border EU direct orders require a VAT ID. The application validates it
  against the EU VIES service before creating the Stripe customer.
- Stripe Checkout continues to collect the billing address and business tax
  ID. Stripe Tax calculates recurring tax from the customer location.
- Reconcile Stripe Tax reports with the VAT returns. Stripe calculation does
  not itself file returns or replace tax advice.

## 3. Invoices

- Configure legal seller name, full address and seller tax ID in Stripe invoice
  settings.
- Configure a unique sequential invoice number format and the correct service
  description/period.
- Enable finalized and paid invoice emails in Stripe or verify the Resend
  transaction email sender.
- Subscribe the production webhook to `checkout.session.completed`,
  `checkout.session.async_payment_succeeded`, `invoice.finalized`,
  `invoice.finalization_failed`, `invoice.paid`, `invoice.payment_failed`,
  `customer.subscription.updated` and `customer.subscription.deleted`.
- In 2026, a PDF is a "sonstige Rechnung" and may be used during the general
  transition period with recipient consent. The checkout records this consent.
- Implement or procure XRechnung/ZUGFeRD output before the transition applying
  to the business expires. A simple Stripe PDF is not a structured e-invoice.
- Preserve outgoing and incoming structured invoice originals for the
  applicable retention period.
- After a real test invoice contains every required item and delivery works,
  set `WIDGET_INVOICE_DELIVERY_READY=1`.

## 4. Contract evidence

Migration `0013_widget_legal_acceptance.sql` stores:

- terms, privacy and DPA version;
- acceptance/acknowledgement timestamps;
- B2B and electronic invoice confirmations;
- plan, price, currency, minimum term and renewal snapshot;
- VAT-ID validation status and time.

The checkout links every document before submission. The Stripe session and
subscription carry the terms/DPA/tax-mode versions in metadata. The webhook
sends an order confirmation and sends invoices after finalization.

## 5. Cancellation and renewal

- Minimum term: 12 months.
- Monthly plan: monthly collection during the binding first 12 months.
- Annual plan: first 12 months paid in advance at the configured annual price.
- After the minimum term: automatic one-month renewal at the monthly price.
- An ordinary cancellation during the minimum term takes effect at the end of
  that term; after that, at the end of the current monthly billing period.
- Customers can cancel in text form by email. The authenticated admin customer
  cockpit applies the permitted effective date to Stripe.

## 6. Data protection

- Maintain current Article 28 agreements with AWS, Cloudflare and every other
  processor.
- Verify transfer mechanisms, EU regions and deletion settings.
- Notify widget customers before material sub-processor changes.
- Keep the TOMs in the DPA consistent with actual production controls.
- Keep a processing record and incident workflow.

## Primary sources checked on 16 July 2026

- German Civil Code, inclusion of standard terms:
  https://www.gesetze-im-internet.de/bgb/__305.html
- German Civil Code, content control:
  https://www.gesetze-im-internet.de/bgb/__307.html
- GDPR Articles 13 and 28:
  https://eur-lex.europa.eu/legal-content/DE/TXT/?uri=CELEX:32016R0679
- German VAT Act, invoice requirements:
  https://www.gesetze-im-internet.de/ustg_1980/__14.html
- Federal Ministry of Finance, e-invoice transition:
  https://www.bundesfinanzministerium.de/Content/DE/FAQ/e-rechnung.html
- EU Commission, VAT IDs and VIES:
  https://taxation-customs.ec.europa.eu/taxation/vat/vat-directive/vat-identification-numbers_en
- Stripe, tax IDs in Checkout:
  https://docs.stripe.com/tax/checkout/tax-ids
- Stripe, automatic tax in Checkout:
  https://docs.stripe.com/tax/checkout
