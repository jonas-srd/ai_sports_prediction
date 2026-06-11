"use client";

import { TIME_ZONE_OPTIONS } from "@/lib/timezone";
import { useTimeZone } from "@/components/time-zone-provider";

export function TimeZoneSelect() {
  const { timeZone, setTimeZone } = useTimeZone();

  return (
    <label className="siteNavTimeZone">
      <span>Timezone</span>
      <select
        aria-label="Display timezone"
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
