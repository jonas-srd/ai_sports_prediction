import type { SiteLocale } from "@/lib/i18n";
import { translateText } from "@/lib/site-translations";

/** Preserve React's text-node whitespace exactly when translation is a no-op. */
export function translatePublicText(value: string, locale: SiteLocale): string {
  const content = value.trim();
  if (!content) return value;
  const leading = value.match(/^\s*/)?.[0] ?? "";
  const trailing = value.match(/\s*$/)?.[0] ?? "";
  return `${leading}${translateText(content, locale)}${trailing}`;
}
