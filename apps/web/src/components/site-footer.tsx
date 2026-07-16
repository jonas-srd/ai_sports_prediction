"use client";

import Link from "next/link";
import { useLocale } from "@/components/locale-provider";
import { commonText, localizePath } from "@/lib/i18n";

export function SiteFooter() {
  const { locale } = useLocale();
  const text = commonText[locale];

  return (
    <footer className="siteFooter">
      <div className="siteFooterInner">
        <span>AI Sports Prediction</span>
        <Link href={localizePath("/impressum", locale)}>{text.legalNotice}</Link>
        <Link href={localizePath("/privacy", locale)}>{locale === "de" ? "Datenschutz" : "Privacy"}</Link>
        <Link href={localizePath("/widget-terms", locale)}>{locale === "de" ? "Widget-AGB" : "Widget terms"}</Link>
        <Link href={localizePath("/data-processing", locale)}>{locale === "de" ? "AVV" : "DPA"}</Link>
        <Link href={localizePath("/cookies", locale)}>{locale === "de" ? "Cookies" : "Cookies"}</Link>
      </div>
    </footer>
  );
}
