"use client";

import { getTimeZoneOptions } from "@/lib/timezone";
import { useTimeZone } from "@/components/time-zone-provider";
import { useLocale } from "@/components/locale-provider";
import { commonText, getIntlLocale } from "@/lib/i18n";

export function TimeZoneSelect() {
  const { timeZone, setTimeZone } = useTimeZone();
  const { siteLocale, t } = useLocale();
  const text = commonText[siteLocale];
  const standardOptions = getTimeZoneOptions(getIntlLocale(siteLocale));
  const timeZoneOptions = standardOptions.some((option) => option.value === timeZone)
    ? standardOptions
    : [{ value: timeZone, label: `${t("Local time")} (${timeZone.replaceAll("_", " ")})` }, ...standardOptions];

  return (
    <label className="siteNavControl">
      <span>{text.timezone}</span>
      <select
        aria-label={text.displayTimezone}
        value={timeZone}
        onChange={(event) => setTimeZone(event.target.value)}
      >
        {timeZoneOptions.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </label>
  );
}
