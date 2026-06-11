"use client";

import { TIME_ZONE_OPTIONS } from "@/lib/timezone";
import { useTimeZone } from "@/components/time-zone-provider";
import { useLocale } from "@/components/locale-provider";
import { commonText } from "@/lib/i18n";

export function TimeZoneSelect() {
  const { timeZone, setTimeZone } = useTimeZone();
  const { locale } = useLocale();
  const text = commonText[locale];

  return (
    <label className="siteNavControl">
      <span>{text.timezone}</span>
      <select
        aria-label={text.displayTimezone}
        value={timeZone}
        onChange={(event) => setTimeZone(event.target.value)}
      >
        {TIME_ZONE_OPTIONS.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </label>
  );
}
