"use client";

import { useEffect } from "react";
import { useLocale } from "@/components/locale-provider";

export function HtmlLangSync() {
  const { locale } = useLocale();

  useEffect(() => {
    document.documentElement.lang = locale;
  }, [locale]);

  return null;
}

