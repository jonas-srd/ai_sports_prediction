"use client";

import Link from "next/link";
import { useState, type FormEvent } from "react";
import { trackBeginCheckout, trackGrowthEvent } from "@/lib/growth-analytics";
import { localizePath, type Locale } from "@/lib/i18n";
import type { WidgetAccessPlan } from "@/lib/widget-access";
import type { WidgetBillingInterval } from "@/lib/widget-billing";
import {
  WIDGET_DPA_VERSION,
  WIDGET_PRIVACY_VERSION,
  WIDGET_TERMS_VERSION,
  type WidgetTaxMode
} from "@/lib/widget-legal-versions";

type CheckoutStatus = "idle" | "submitting" | "success" | "error";

type CheckoutPlan = {
  annualPrice: string;
  features: string[];
  monthlyPrice: string;
  monthlyTermTotal: string;
  name: string;
};

const plans: Record<Locale, Record<WidgetAccessPlan, CheckoutPlan>> = {
  en: {
    starter: { name: "Starter", monthlyPrice: "49 EUR / month", annualPrice: "539 EUR / first 12 months", monthlyTermTotal: "588 EUR", features: ["50k widget requests", "2 approved domains", "All core prediction widgets"] },
    growth: { name: "Growth", monthlyPrice: "149 EUR / month", annualPrice: "1,639 EUR / first 12 months", monthlyTermTotal: "1,788 EUR", features: ["250k widget requests", "8 approved domains", "All widget formats and customization"] },
    enterprise: { name: "Enterprise", monthlyPrice: "Custom offer", annualPrice: "Custom offer", monthlyTermTotal: "Custom offer", features: ["Custom traffic volume", "White-label and SLA options", "Personal commercial terms"] }
  },
  de: {
    starter: { name: "Starter", monthlyPrice: "49 EUR / Monat", annualPrice: "539 EUR / erste 12 Monate", monthlyTermTotal: "588 EUR", features: ["50k Widget-Aufrufe", "2 freigegebene Domains", "Alle zentralen Prognose-Widgets"] },
    growth: { name: "Growth", monthlyPrice: "149 EUR / Monat", annualPrice: "1.639 EUR / erste 12 Monate", monthlyTermTotal: "1.788 EUR", features: ["250k Widget-Aufrufe", "8 freigegebene Domains", "Alle Widget-Formate und Anpassungen"] },
    enterprise: { name: "Enterprise", monthlyPrice: "Individuelles Angebot", annualPrice: "Individuelles Angebot", monthlyTermTotal: "Individuelles Angebot", features: ["Individuelles Traffic-Volumen", "White-Label- und SLA-Optionen", "Persönliche Vertragskonditionen"] }
  }
};

const countries = [
  ["DE", "Deutschland", "Germany"], ["AT", "Österreich", "Austria"], ["CH", "Schweiz", "Switzerland"],
  ["BE", "Belgien", "Belgium"], ["BG", "Bulgarien", "Bulgaria"], ["HR", "Kroatien", "Croatia"],
  ["CY", "Zypern", "Cyprus"], ["CZ", "Tschechien", "Czechia"], ["DK", "Dänemark", "Denmark"],
  ["EE", "Estland", "Estonia"], ["FI", "Finnland", "Finland"], ["FR", "Frankreich", "France"],
  ["GR", "Griechenland", "Greece"], ["HU", "Ungarn", "Hungary"], ["IE", "Irland", "Ireland"],
  ["IT", "Italien", "Italy"], ["LV", "Lettland", "Latvia"], ["LT", "Litauen", "Lithuania"],
  ["LU", "Luxemburg", "Luxembourg"], ["MT", "Malta", "Malta"], ["NL", "Niederlande", "Netherlands"],
  ["PL", "Polen", "Poland"], ["PT", "Portugal", "Portugal"], ["RO", "Rumänien", "Romania"],
  ["SK", "Slowakei", "Slovakia"], ["SI", "Slowenien", "Slovenia"], ["ES", "Spanien", "Spain"],
  ["SE", "Schweden", "Sweden"], ["GB", "Vereinigtes Königreich", "United Kingdom"], ["NO", "Norwegen", "Norway"],
  ["IS", "Island", "Iceland"], ["LI", "Liechtenstein", "Liechtenstein"], ["US", "Vereinigte Staaten", "United States"],
  ["CA", "Kanada", "Canada"], ["AU", "Australien", "Australia"], ["NZ", "Neuseeland", "New Zealand"],
  ["BR", "Brasilien", "Brazil"], ["MX", "Mexiko", "Mexico"], ["AR", "Argentinien", "Argentina"],
  ["CL", "Chile", "Chile"], ["CO", "Kolumbien", "Colombia"], ["IN", "Indien", "India"],
  ["JP", "Japan", "Japan"], ["KR", "Südkorea", "South Korea"], ["SG", "Singapur", "Singapore"],
  ["ZA", "Südafrika", "South Africa"], ["AE", "Vereinigte Arabische Emirate", "United Arab Emirates"],
  ["IL", "Israel", "Israel"], ["TR", "Türkei", "Türkiye"], ["UA", "Ukraine", "Ukraine"]
] as const;

const copy = {
  en: {
    address1: "Street and house number",
    address2: "Address addition (optional)",
    back: "Back to plans",
    billingAddress: "Billing address",
    billingEmail: "Invoice email",
    business: "I confirm that I am ordering as a business customer within the meaning of section 14 BGB.",
    canceled: "Checkout was cancelled. Your details were not submitted as a paid order.",
    city: "City",
    company: "Company details",
    contact: "Contact person",
    contactEmail: "Access email",
    contract: "I accept the 12-month minimum term. Afterwards, the contract renews one month at a time and can be cancelled monthly.",
    country: "Country",
    data: "The entered information is used to create the customer account, calculate taxes and issue invoices. Payment data is entered only on Stripe's secure page.",
    error: "The checkout could not be started. Please check the information and try again.",
    firstName: "First name",
    invoiceInfo: "These details appear on the invoice",
    lastName: "Last name",
    legalCompany: "Legal company name",
    legalNote: "The binding paid order is placed only in Stripe Checkout. Prices are net plus applicable VAT.",
    monthlyTotal: "Total during the 12-month minimum term",
    next: "Continue to secure payment",
    nextEnterprise: "Send enterprise request",
    payment: "Payment",
    phone: "Phone (optional)",
    postalCode: "Postal code",
    privacy: "I have read the privacy notice.",
    publication: "Publication / brand",
    region: "State / region",
    renewal: "After 12 months: automatic monthly renewal at",
    secure: "Secure payment through Stripe",
    step1: "Plan",
    step2: "Billing details",
    step3: "Payment",
    submitHelp: "Next, Stripe collects the SEPA mandate and confirms the final total including tax.",
    success: "Your SEPA mandate was submitted. We send the invoice and publisher access after Stripe confirms the payment.",
    summary: "Order summary",
    taxId: "Business VAT / tax ID (required for cross-border EU orders)",
    title: "Complete your order",
    website: "Website domain"
  },
  de: {
    address1: "Straße und Hausnummer",
    address2: "Adresszusatz (optional)",
    back: "Zurück zu den Tarifen",
    billingAddress: "Rechnungsanschrift",
    billingEmail: "Rechnungs-E-Mail",
    business: "Ich bestätige, dass ich als Unternehmer im Sinne des § 14 BGB bestelle.",
    canceled: "Der Checkout wurde abgebrochen. Deine Angaben wurden nicht als kostenpflichtige Bestellung übermittelt.",
    city: "Ort",
    company: "Unternehmensdaten",
    contact: "Ansprechpartner",
    contactEmail: "E-Mail für den Zugang",
    contract: "Ich akzeptiere 12 Monate Mindestlaufzeit. Danach verlängert sich der Vertrag jeweils um einen Monat und kann monatlich gekündigt werden.",
    country: "Land",
    data: "Die Angaben werden für Kundenkonto, Steuerberechnung und Rechnungserstellung verwendet. Zahlungsdaten werden ausschließlich auf der sicheren Stripe-Seite eingegeben.",
    error: "Der Checkout konnte nicht gestartet werden. Bitte prüfe die Angaben und versuche es erneut.",
    firstName: "Vorname",
    invoiceInfo: "Diese Angaben erscheinen auf der Rechnung",
    lastName: "Nachname",
    legalCompany: "Vollständiger Firmenname",
    legalNote: "Die verbindliche kostenpflichtige Bestellung erfolgt erst im Stripe-Checkout. Preise netto zuzüglich gesetzlicher Umsatzsteuer.",
    monthlyTotal: "Summe während der 12-monatigen Mindestlaufzeit",
    next: "Weiter zur sicheren Zahlung",
    nextEnterprise: "Enterprise-Anfrage senden",
    payment: "Zahlung",
    phone: "Telefon (optional)",
    postalCode: "Postleitzahl",
    privacy: "Ich habe die Datenschutzerklärung zur Kenntnis genommen.",
    publication: "Redaktion / Marke",
    region: "Bundesland / Region",
    renewal: "Nach 12 Monaten: automatische monatliche Verlängerung zu",
    secure: "Sichere Zahlung über Stripe",
    step1: "Tarif",
    step2: "Rechnungsdaten",
    step3: "Zahlung",
    submitHelp: "Im nächsten Schritt erfasst Stripe das SEPA-Mandat und zeigt den Endbetrag einschließlich Steuer.",
    success: "Dein SEPA-Mandat wurde eingereicht. Rechnung und Publisher-Zugang werden nach bestätigter Stripe-Zahlung versendet.",
    summary: "Bestellübersicht",
    taxId: "Unternehmer-USt-ID / betriebliche Steuer-ID (bei EU-Ausland erforderlich)",
    title: "Bestellung abschließen",
    website: "Website-Domain"
  }
};

export function WidgetCheckout({
  billingInterval,
  checkoutState,
  locale,
  selectedPlan,
  taxMode
}: {
  billingInterval: WidgetBillingInterval;
  checkoutState: "canceled" | "success" | null;
  locale: Locale;
  selectedPlan: WidgetAccessPlan;
  taxMode: WidgetTaxMode | null;
}) {
  const text = copy[locale];
  const plan = plans[locale][selectedPlan];
  const isEnterprise = selectedPlan === "enterprise";
  const [status, setStatus] = useState<CheckoutStatus>(checkoutState === "success" ? "success" : "idle");
  const [message, setMessage] = useState(checkoutState === "success" ? text.success : checkoutState === "canceled" ? text.canceled : "");
  const widgetsHref = localizePath("/widgets", locale);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    setStatus("submitting");
    setMessage("");

    try {
      const response = await fetch("/api/widgets/access-request", {
        body: JSON.stringify({
          addressLine1: data.get("addressLine1"),
          addressLine2: data.get("addressLine2"),
          billingEmail: data.get("billingEmail"),
          billingInterval,
          businessCustomerAccepted: data.get("businessCustomerAccepted") === "on",
          city: data.get("city"),
          company: data.get("company"),
          dpaAccepted: isEnterprise || data.get("dpaAccepted") === "on",
          electronicInvoiceAccepted: isEnterprise || data.get("electronicInvoiceAccepted") === "on",
          privacyAcknowledged: data.get("privacyAcknowledged") === "on",
          contactFirstName: data.get("contactFirstName"),
          contactLastName: data.get("contactLastName"),
          termsAccepted: isEnterprise || data.get("termsAccepted") === "on",
          country: data.get("country"),
          email: data.get("email"),
          legalCompanyName: data.get("legalCompanyName"),
          locale,
          phone: data.get("phone"),
          plan: selectedPlan,
          postalCode: data.get("postalCode"),
          publicationName: data.get("publicationName"),
          state: data.get("state"),
          taxId: data.get("taxId"),
          websiteUrl: data.get("websiteUrl")
        }),
        headers: { "content-type": "application/json" },
        method: "POST"
      });
      const body = await response.json() as { checkoutAvailable?: boolean; checkoutUrl?: string; error?: string; ok?: boolean };
      if (!response.ok || !body.ok) throw new Error(checkoutError(body.error, locale, text.error));

      trackGrowthEvent(isEnterprise ? "widget_sales_request" : "widget_access_request", { billingInterval, plan: selectedPlan });
      if (body.checkoutUrl) {
        trackGrowthEvent("widget_checkout_started", { billingInterval, plan: selectedPlan });
        trackBeginCheckout(selectedPlan, billingInterval);
        window.location.assign(body.checkoutUrl);
        return;
      }
      setStatus("success");
      setMessage(isEnterprise ? (locale === "de" ? "Danke – wir melden uns mit einem individuellen Angebot." : "Thanks — we will contact you with a custom offer.") : (locale === "de" ? "Die Online-Zahlung ist noch nicht aktiviert. Wir melden uns zur Freischaltung." : "Online payment is not active yet. We will contact you about activation."));
    } catch (error) {
      setStatus("error");
      setMessage(error instanceof Error ? error.message : text.error);
    }
  }

  if (status === "success" && checkoutState === "success") {
    return (
      <main className="widgetCheckoutPage">
        <section className="widgetCheckoutResult isSuccess">
          <span aria-hidden="true">✓</span>
          <p className="footballEyebrow">{text.payment}</p>
          <h1>{locale === "de" ? "Zahlung wird bestätigt" : "Payment is being confirmed"}</h1>
          <p>{message}</p>
          <Link className="widgetsPricingCta" href={widgetsHref}>{locale === "de" ? "Zurück zu den Widgets" : "Back to widgets"}</Link>
        </section>
      </main>
    );
  }

  return (
    <main className="widgetCheckoutPage">
      <div className="widgetCheckoutTopbar">
        <Link href={widgetsHref}>← {text.back}</Link>
        <span>{text.secure}</span>
      </div>

      <ol className="widgetCheckoutSteps" aria-label={locale === "de" ? "Bestellschritte" : "Checkout steps"}>
        <li className="isComplete"><span>1</span>{text.step1}</li>
        <li className="isActive"><span>2</span>{text.step2}</li>
        <li><span>3</span>{text.step3}</li>
      </ol>

      <div className="widgetCheckoutLayout">
        <section className="widgetCheckoutFormCard" aria-labelledby="widget-checkout-title">
          <p className="footballEyebrow">{isEnterprise ? "Enterprise" : text.step2}</p>
          <h1 id="widget-checkout-title">{text.title}</h1>
          <p className="widgetCheckoutIntro">{text.data}</p>
          {message ? <p className={`widgetLeadMessage is-${status}`} role="status">{message}</p> : null}

          <form onSubmit={submit}>
            <input aria-hidden="true" autoComplete="off" className="widgetLeadHoneypot" name="company" tabIndex={-1} />

            <fieldset>
              <legend><span>1</span>{text.contact}</legend>
              <div className="widgetCheckoutFields">
                <label><span>{text.firstName}</span><input autoComplete="given-name" maxLength={80} name="contactFirstName" required /></label>
                <label><span>{text.lastName}</span><input autoComplete="family-name" maxLength={80} name="contactLastName" required /></label>
                <label><span>{text.contactEmail}</span><input autoComplete="email" name="email" required type="email" /></label>
                <label><span>{text.phone}</span><input autoComplete="tel" maxLength={40} name="phone" type="tel" /></label>
              </div>
            </fieldset>

            <fieldset>
              <legend><span>2</span>{text.company}</legend>
              <div className="widgetCheckoutFields">
                <label className="isWide"><span>{text.legalCompany}</span><input autoComplete="organization" maxLength={160} name="legalCompanyName" required /></label>
                <label><span>{text.publication}</span><input maxLength={120} name="publicationName" required /></label>
                <label><span>{text.website}</span><input inputMode="url" name="websiteUrl" placeholder="https://publisher.example" required /></label>
              </div>
            </fieldset>

            <fieldset>
              <legend><span>3</span>{text.billingAddress}<small>{text.invoiceInfo}</small></legend>
              <div className="widgetCheckoutFields">
                <label className="isWide"><span>{text.billingEmail}</span><input autoComplete="email" name="billingEmail" required type="email" /></label>
                <label className="isWide"><span>{text.address1}</span><input autoComplete="address-line1" maxLength={160} name="addressLine1" required /></label>
                <label className="isWide"><span>{text.address2}</span><input autoComplete="address-line2" maxLength={160} name="addressLine2" /></label>
                <label><span>{text.postalCode}</span><input autoComplete="postal-code" maxLength={24} name="postalCode" required /></label>
                <label><span>{text.city}</span><input autoComplete="address-level2" maxLength={100} name="city" required /></label>
                <label><span>{text.region}</span><input autoComplete="address-level1" maxLength={100} name="state" required /></label>
                <label><span>{text.country}</span><select autoComplete="country" defaultValue="DE" name="country" required>{countries.map(([code, de, en]) => <option key={code} value={code}>{locale === "de" ? de : en}</option>)}</select></label>
                <label className="isWide"><span>{text.taxId}</span><input autoComplete="off" maxLength={40} name="taxId" placeholder="DE123456789" /></label>
              </div>
            </fieldset>

            <div className="widgetCheckoutConfirmations">
              <label>
                <input name="privacyAcknowledged" required type="checkbox" />
                <span>{text.privacy} <Link href={localizePath("/privacy", locale)} target="_blank">{locale === "de" ? `Datenschutz, Stand ${WIDGET_PRIVACY_VERSION}` : `Privacy notice, version ${WIDGET_PRIVACY_VERSION}`}</Link></span>
              </label>
              <label><input name="businessCustomerAccepted" required type="checkbox" /><span>{text.business}</span></label>
              {!isEnterprise ? (
                <>
                  <label>
                    <input name="termsAccepted" required type="checkbox" />
                    <span>{text.contract} <Link href={localizePath("/widget-terms", locale)} target="_blank">{locale === "de" ? `Widget-Lizenzbedingungen, Stand ${WIDGET_TERMS_VERSION}` : `Widget terms, version ${WIDGET_TERMS_VERSION}`}</Link></span>
                  </label>
                  <label>
                    <input name="dpaAccepted" required type="checkbox" />
                    <span>{locale === "de" ? "Ich akzeptiere den AVV für den Fall, dass AI Sports Prediction personenbezogene Daten in meinem Auftrag verarbeitet." : "I accept the DPA where AI Sports Prediction processes personal data on my behalf."} <Link href={localizePath("/data-processing", locale)} target="_blank">{locale === "de" ? `AVV, Stand ${WIDGET_DPA_VERSION}` : `DPA, version ${WIDGET_DPA_VERSION}`}</Link></span>
                  </label>
                  <label>
                    <input name="electronicInvoiceAccepted" required type="checkbox" />
                    <span>{locale === "de" ? "Ich stimme der elektronischen Rechnungsübermittlung an die angegebene Rechnungs-E-Mail zu." : "I agree to electronic invoice delivery to the billing email provided."}</span>
                  </label>
                </>
              ) : null}
            </div>

            <button className="widgetCheckoutSubmit" disabled={status === "submitting"} type="submit">
              <span>{isEnterprise ? text.nextEnterprise : text.next}</span>
              <small>{isEnterprise ? (locale === "de" ? "Unverbindliche Anfrage" : "Non-binding request") : text.submitHelp}</small>
            </button>
            <p className="widgetCheckoutLegal">
              {taxMode === "small_business"
                ? (locale === "de" ? "Gemäß § 19 UStG wird keine Umsatzsteuer berechnet." : "No VAT is charged under the German small-business scheme (§ 19 UStG).")
                : text.legalNote}{" "}
              <Link href={localizePath("/impressum", locale)}>{locale === "de" ? "Impressum" : "Legal notice"}</Link>
            </p>
          </form>
        </section>

        <aside className="widgetCheckoutSummary" aria-labelledby="widget-summary-title">
          <div className="widgetCheckoutSummaryHeader">
            <p>{text.summary}</p>
            <Link href={widgetsHref}>{locale === "de" ? "Ändern" : "Change"}</Link>
          </div>
          <div className="widgetCheckoutProduct">
            <span>{selectedPlan.toUpperCase()}</span>
            <h2 id="widget-summary-title">{plan.name}</h2>
            <strong>{billingInterval === "annual" ? plan.annualPrice : plan.monthlyPrice}</strong>
          </div>
          <ul>{plan.features.map((feature) => <li key={feature}>✓ {feature}</li>)}</ul>
          {!isEnterprise ? (
            <dl>
              {billingInterval === "monthly" ? <div><dt>{text.monthlyTotal}</dt><dd>{plan.monthlyTermTotal}</dd></div> : null}
              <div><dt>{locale === "de" ? "Mindestlaufzeit" : "Minimum term"}</dt><dd>12 {locale === "de" ? "Monate" : "months"}</dd></div>
              <div><dt>{text.renewal}</dt><dd>{plan.monthlyPrice}</dd></div>
              <div><dt>{locale === "de" ? "Zahlungsart" : "Payment method"}</dt><dd>SEPA Direct Debit</dd></div>
            </dl>
          ) : null}
          <div className="widgetCheckoutSecurity">
            <span aria-hidden="true">⌁</span>
            <p><strong>{locale === "de" ? "Sicherer Checkout" : "Secure checkout"}</strong>{locale === "de" ? "Zahlungsdaten werden verschlüsselt bei Stripe eingegeben." : "Payment details are entered securely and encrypted at Stripe."}</p>
          </div>
        </aside>
      </div>
    </main>
  );
}

function checkoutError(code: string | undefined, locale: Locale, fallback: string): string {
  const messages: Record<string, [string, string]> = {
    electronic_invoice_required: ["Please accept electronic invoice delivery.", "Bitte stimme der elektronischen Rechnungsübermittlung zu."],
    eu_vat_id_required: ["A valid VAT ID is required for cross-border EU orders.", "Für grenzüberschreitende EU-Bestellungen ist eine gültige USt-ID erforderlich."],
    invalid_eu_vat_id: ["The VAT ID could not be confirmed by VIES.", "Die USt-ID konnte durch VIES nicht bestätigt werden."],
    vat_validation_unavailable: ["EU VAT validation is temporarily unavailable. Please try again later.", "Die EU-USt-ID-Prüfung ist vorübergehend nicht erreichbar. Bitte versuche es später erneut."]
  };
  const message = code ? messages[code] : undefined;
  return message ? message[locale === "de" ? 1 : 0] : fallback;
}
