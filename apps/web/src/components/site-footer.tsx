"use client";

import Link from "next/link";
import { useLocale } from "@/components/locale-provider";
import { commonText, localizePath } from "@/lib/i18n";

export function SiteFooter() {
  const { locale, siteLocale, t } = useLocale();
  const text = commonText[siteLocale];

  return (
    <footer className="siteFooter">
      <div className="siteFooterInner">
        <span>Residual Sports</span>
        <Link href={localizePath("/impressum", locale)}>{text.legalNotice}</Link>
        <Link href={localizePath("/terms", siteLocale)}>{t("Terms")}</Link>
        <Link href={localizePath("/privacy", siteLocale)}>{t("Privacy")}</Link>
        <Link href={localizePath("/widget-terms", siteLocale)}>{t("Widget terms")}</Link>
        <Link href={localizePath("/data-processing", locale)}>{locale === "de" ? "AVV" : "DPA"}</Link>
        <Link href={localizePath("/cookies", locale)}>{locale === "de" ? "Cookies" : "Cookies"}</Link>
      </div>
    </footer>
  );
}
