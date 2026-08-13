"use client";

import { usePathname } from "next/navigation";
import { commonText, LOCALE_LABELS, SUPPORTED_LOCALES, switchLocalePath, type SiteLocale } from "@/lib/i18n";
import { useLocale } from "@/components/locale-provider";

export function LanguageSelect() {
  const { siteLocale } = useLocale();
  const pathname = usePathname() ?? "/";
  const text = commonText[siteLocale];

  const changeLanguage = (nextLocale: SiteLocale) => {
    const nextPath = switchLocalePath(pathname, nextLocale);
    // Language changes cross rewritten and native localized routes. A full
    // navigation guarantees that no translated text from the previous route
    // survives in React's client-side DOM.
    window.location.assign(`${nextPath}${window.location.search}${window.location.hash}`);
  };

  return (
    <label className="siteNavControl siteNavControl--language">
      <span>{text.language}</span>
      <select
        aria-label={text.displayLanguage}
        value={siteLocale}
        onChange={(event) => changeLanguage(event.target.value as SiteLocale)}
      >
        {SUPPORTED_LOCALES.map((option) => (
          <option key={option} value={option}>
            {LOCALE_LABELS[option]}
          </option>
        ))}
      </select>
    </label>
  );
}
