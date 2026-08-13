"use client";

import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { usePathname } from "next/navigation";
import { getLocaleFromPathname, getSiteLocaleFromPathname, type Locale, type SiteLocale } from "@/lib/i18n";
import { translateText } from "@/lib/site-translations";

type LocaleContextValue = {
  locale: Locale;
  siteLocale: SiteLocale;
  t: (value: string) => string;
};

const LocaleContext = createContext<LocaleContextValue | null>(null);

export function LocaleProvider({ children, initialSiteLocale }: { children: ReactNode; initialSiteLocale?: SiteLocale }) {
  const pathname = usePathname();
  // Secondary-language URLs are internally rewritten to the English route.
  // Start server and client from the same locale, then read the visible URL
  // after hydration so React never compares English server markup with a
  // translated client tree.
  const [siteLocale, setSiteLocale] = useState<SiteLocale>(() => initialSiteLocale ?? getSiteLocaleFromPathname(pathname));

  useEffect(() => {
    setSiteLocale(getSiteLocaleFromPathname(window.location.pathname));
  }, [pathname]);

  const locale = getLocaleFromPathname(siteLocale === "en" ? "/" : `/${siteLocale}`);
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
