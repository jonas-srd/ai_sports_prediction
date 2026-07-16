export const WIDGET_TERMS_VERSION = "2026-07-16";
export const WIDGET_PRIVACY_VERSION = "2026-07-16";
export const WIDGET_DPA_VERSION = "2026-07-16";

export type WidgetTaxMode = "small_business" | "standard";

export function parseWidgetTaxMode(value: unknown): WidgetTaxMode | null {
  return value === "standard" || value === "small_business" ? value : null;
}
