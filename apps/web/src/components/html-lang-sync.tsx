"use client";

import { useEffect } from "react";
import { useLocale } from "@/components/locale-provider";

export function HtmlLangSync() {
  const { siteLocale } = useLocale();

  useEffect(() => {
    document.documentElement.lang = siteLocale;
  }, [siteLocale]);

  return null;
}
