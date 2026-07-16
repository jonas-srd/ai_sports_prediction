import type { Metadata } from "next";
import { WidgetCheckout } from "@/components/widget-checkout";
import type { Locale } from "@/lib/i18n";
import type { WidgetAccessPlan } from "@/lib/widget-access";
import { parseWidgetBillingInterval } from "@/lib/widget-billing";
import { getWidgetSellerDetails } from "@/lib/widget-sales-config";

export const metadata: Metadata = {
  title: "Widget checkout | AI Sports Prediction",
  description: "Complete the billing details for AI Sports Prediction widgets.",
  robots: { index: false, follow: false }
};

type CheckoutSearchParams = Promise<Record<string, string | string[] | undefined>>;

export default async function WidgetCheckoutPage({ searchParams }: { searchParams: CheckoutSearchParams }) {
  return <WidgetCheckoutPageContent locale="en" searchParams={searchParams} />;
}

export async function WidgetCheckoutPageContent({ locale, searchParams }: { locale: Locale; searchParams: CheckoutSearchParams }) {
  const params = await searchParams;
  const plan = normalizePlan(single(params.plan));
  const billingInterval = parseWidgetBillingInterval(single(params.billing));
  const checkoutState = normalizeCheckoutState(single(params.checkout));
  const taxMode = getWidgetSellerDetails().taxMode;

  return <WidgetCheckout billingInterval={billingInterval} checkoutState={checkoutState} locale={locale} selectedPlan={plan} taxMode={taxMode} />;
}

function normalizePlan(value: string | undefined): WidgetAccessPlan {
  return value === "growth" || value === "enterprise" ? value : "starter";
}

function normalizeCheckoutState(value: string | undefined): "canceled" | "success" | null {
  return value === "success" || value === "canceled" ? value : null;
}

function single(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}
