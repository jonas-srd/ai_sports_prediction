"use client";

import Link from "next/link";
import { useLocale } from "@/components/locale-provider";
import { commonText, localizePath } from "@/lib/i18n";

export function SiteFooter() {
  const { siteLocale, t } = useLocale();
  const text = commonText[siteLocale];

  return (
    <footer className="siteFooter">
      <div className="siteFooterInner">
        <span>Residual Sports</span>
        <Link href={localizePath("/impressum", siteLocale)}>{text.legalNotice}</Link>
        <Link href={localizePath("/terms", siteLocale)}>{t("Terms")}</Link>
        <Link href={localizePath("/privacy", siteLocale)}>{t("Privacy")}</Link>
        <Link href={localizePath("/widget-terms", siteLocale)}>{t("Widget terms")}</Link>
        <Link href={localizePath("/data-processing", siteLocale)}>{siteLocale === "de" ? "AVV" : "DPA"}</Link>
        <Link href={localizePath("/cookies", siteLocale)}>{t("Cookies")}</Link>
      </div>
    </footer>
  );
}
