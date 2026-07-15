"use client";

import Link from "next/link";
import { useState } from "react";
import { trackGrowthEvent } from "@/lib/growth-analytics";
import { localizePath, type Locale } from "@/lib/i18n";

export type WidgetPricingPlan = {
  annualPrice: string;
  description: string;
  features: string[];
  monthlyMinimumTermTotal: string;
  monthlyPrice: string;
  name: string;
  plan: "starter" | "growth" | "enterprise";
};

type BillingInterval = "monthly" | "annual";

const copy = {
  en: {
    annual: "Annual upfront",
    buttons: { starter: "Choose Starter", growth: "Choose Growth", enterprise: "Contact sales" },
    checkoutNote: "Billing details and payment are completed on the next page.",
    monthly: "Pay monthly"
  },
  de: {
    annual: "Jährlich im Voraus",
    buttons: { starter: "Starter wählen", growth: "Growth wählen", enterprise: "Vertrieb kontaktieren" },
    checkoutNote: "Rechnungsdaten und Zahlung werden auf der nächsten Seite abgeschlossen.",
    monthly: "Monatlich bezahlen"
  }
};

export function WidgetGrowthFunnel({ locale, plans }: { locale: Locale; plans: WidgetPricingPlan[] }) {
  const text = copy[locale];
  const [billingInterval, setBillingInterval] = useState<BillingInterval>("monthly");
  const checkoutBase = localizePath("/widgets/checkout", locale);

  return (
    <>
      <div className="widgetBillingSwitch" aria-label={locale === "de" ? "Zahlungsweise" : "Billing frequency"} role="group">
        <button aria-pressed={billingInterval === "monthly"} className={billingInterval === "monthly" ? "isActive" : ""} onClick={() => setBillingInterval("monthly")} type="button">{text.monthly}</button>
        <button aria-pressed={billingInterval === "annual"} className={billingInterval === "annual" ? "isActive" : ""} onClick={() => setBillingInterval("annual")} type="button">{text.annual}</button>
      </div>
      <div className="widgetsPricingGrid">
        {plans.map((plan) => {
          const href = `${checkoutBase}?plan=${plan.plan}&billing=${billingInterval}`;
          return (
            <article className="widgetsPricingCard" key={plan.name}>
              <div>
                <span>{plan.plan}</span>
                <h3>{plan.name}</h3>
                <strong>{billingInterval === "annual" ? plan.annualPrice : plan.monthlyPrice}</strong>
                <p>{plan.description}</p>
              </div>
              <ul>{plan.features.map((feature) => <li key={feature}>{feature}</li>)}</ul>
              <Link
                className="widgetsPricingCta"
                href={href}
                onClick={() => trackGrowthEvent("pricing_cta_click", { billingInterval, plan: plan.plan })}
              >
                {text.buttons[plan.plan]}
              </Link>
            </article>
          );
        })}
      </div>
      <p className="widgetPricingCheckoutNote">{text.checkoutNote}</p>
    </>
  );
}
