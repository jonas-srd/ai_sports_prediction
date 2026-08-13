"use client";

import { usePathname, useRouter } from "next/navigation";
import { commonText, LOCALE_LABELS, SUPPORTED_LOCALES, switchLocalePath, type SiteLocale } from "@/lib/i18n";
import { useLocale } from "@/components/locale-provider";

export function LanguageSelect() {
  const { siteLocale } = useLocale();
  const pathname = usePathname() ?? "/";
  const router = useRouter();
  const text = commonText[siteLocale];

  return (
    <label className="siteNavControl">
      <span>{text.language}</span>
      <select
        aria-label={text.displayLanguage}
        value={siteLocale}
        onChange={(event) => router.push(switchLocalePath(pathname, event.target.value as SiteLocale))}
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
