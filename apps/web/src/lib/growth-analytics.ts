export type GrowthEventName =
  | "pricing_cta_click"
  | "widget_access_request"
  | "widget_checkout_started"
  | "widget_sales_request"
  | "widget_embed_copied";

export function trackGrowthEvent(name: GrowthEventName, parameters: Record<string, string | number | boolean> = {}) {
  if (typeof window === "undefined") return;
  window.gtag?.("event", name, parameters);
}
