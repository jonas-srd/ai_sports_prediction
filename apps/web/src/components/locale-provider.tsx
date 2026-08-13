"use client";

import { createContext, useContext, useMemo, type ReactNode } from "react";
import { usePathname } from "next/navigation";
import { getLocaleFromPathname, getSiteLocaleFromPathname, type Locale, type SiteLocale } from "@/lib/i18n";
import { translateText } from "@/lib/site-translations";

type LocaleContextValue = {
  locale: Locale;
  siteLocale: SiteLocale;
  t: (value: string) => string;
};

const LocaleContext = createContext<LocaleContextValue | null>(null);

export function LocaleProvider({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const locale = getLocaleFromPathname(pathname);
  const siteLocale = getSiteLocaleFromPathname(pathname);
  const value = useMemo<LocaleContextValue>(() => ({
    locale,
    siteLocale,
    t: (text: string) => translateText(text, siteLocale)
  }), [locale, siteLocale]);

  return (
    <LocaleContext.Provider value={value}>
      {children}
    </LocaleContext.Provider>
  );
}

export function useLocale(): LocaleContextValue {
  const context = useContext(LocaleContext);
  if (!context) {
    throw new Error("useLocale must be used inside LocaleProvider");
  }

  return context;
}
