"use client";

import { usePathname, useRouter } from "next/navigation";
import { commonText, LOCALE_LABELS, SUPPORTED_LOCALES, switchLocalePath, type Locale } from "@/lib/i18n";
import { useLocale } from "@/components/locale-provider";

export function LanguageSelect() {
  const { locale } = useLocale();
  const pathname = usePathname() ?? "/";
  const router = useRouter();
  const text = commonText[locale];

  return (
    <label className="siteNavControl">
      <span>{text.language}</span>
      <select
        aria-label={text.displayLanguage}
        value={locale}
        onChange={(event) => router.push(switchLocalePath(pathname, event.target.value as Locale))}
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

