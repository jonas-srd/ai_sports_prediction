"use client";

import { useLocale } from "@/components/locale-provider";
import { useTimeZone } from "@/components/time-zone-provider";
import { getIntlLocale } from "@/lib/i18n";

type LocalMatchDateProps = {
  fallback?: string;
  kind?: "date" | "dateTime" | "time";
  value: string | null | undefined;
};

export function LocalMatchDate({ fallback = "—", kind = "dateTime", value }: LocalMatchDateProps) {
  const { siteLocale } = useLocale();
  const { timeZone } = useTimeZone();
  if (!value) return <>{fallback}</>;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return <>{value}</>;
  const options: Intl.DateTimeFormatOptions = kind === "time"
    ? { hour: "2-digit", minute: "2-digit", timeZone }
    : kind === "date"
      ? { day: "2-digit", month: "2-digit", timeZone }
      : { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit", timeZone };
  return <>{new Intl.DateTimeFormat(getIntlLocale(siteLocale), options).format(date)}</>;
}
