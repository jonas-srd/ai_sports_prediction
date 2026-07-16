export type GrowthEventName =
  | "pricing_cta_click"
  | "widget_access_request"
  | "widget_checkout_started"
  | "begin_checkout"
  | "widget_sales_request"
  | "widget_embed_copied";

export function trackGrowthEvent(name: GrowthEventName, parameters: Record<string, unknown> = {}) {
  if (typeof window === "undefined") return;
  window.gtag?.("event", name, parameters);
}

export function trackBeginCheckout(plan: string, billingInterval: string) {
  const value = plan === "growth"
    ? (billingInterval === "annual" ? 1639 : 149)
    : (billingInterval === "annual" ? 539 : 49);
  trackGrowthEvent("begin_checkout", {
    currency: "EUR",
    value,
    items: [{ item_id: plan, item_name: `${plan}-${billingInterval}`, price: value, quantity: 1 }]
  });
}
