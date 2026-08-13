export const DEFAULT_TIME_ZONE = "UTC";

export type TimeZoneOption = {
  value: string;
  label: string;
};

export const TIME_ZONE_OPTIONS: TimeZoneOption[] = [
  { value: "UTC", label: "UTC" },
  { value: "Europe/London", label: "GMT / BST" },
  { value: "Europe/Berlin", label: "CET / CEST" },
  { value: "Europe/Lisbon", label: "WET / WEST" },
  { value: "America/New_York", label: "Eastern Time (ET)" },
  { value: "America/Chicago", label: "Central Time (CT)" },
  { value: "America/Denver", label: "Mountain Time (MT)" },
  { value: "America/Los_Angeles", label: "Pacific Time (PT)" },
  { value: "America/Sao_Paulo", label: "Brasília Time (BRT)" },
  { value: "America/Argentina/Buenos_Aires", label: "Argentina Time (ART)" },
  { value: "Asia/Dubai", label: "Gulf Standard Time (GST)" },
  { value: "Asia/Kolkata", label: "India Standard Time (IST)" },
  { value: "Asia/Singapore", label: "Singapore Time (SGT)" },
  { value: "Asia/Tokyo", label: "Japan Standard Time (JST)" },
  { value: "Australia/Sydney", label: "Australian Eastern Time (AET)" },
  { value: "Pacific/Auckland", label: "New Zealand Time (NZT)" }
];

const TIME_ZONE_ALIASES: Record<string, string> = {
  "Europe/Amsterdam": "Europe/Berlin",
  "Europe/Andorra": "Europe/Berlin",
  "Europe/Belgrade": "Europe/Berlin",
  "Europe/Bratislava": "Europe/Berlin",
  "Europe/Brussels": "Europe/Berlin",
  "Europe/Budapest": "Europe/Berlin",
  "Europe/Copenhagen": "Europe/Berlin",
  "Europe/Gibraltar": "Europe/Berlin",
  "Europe/Ljubljana": "Europe/Berlin",
  "Europe/Luxembourg": "Europe/Berlin",
  "Europe/Madrid": "Europe/Berlin",
  "Europe/Malta": "Europe/Berlin",
  "Europe/Monaco": "Europe/Berlin",
  "Europe/Oslo": "Europe/Berlin",
  "Europe/Paris": "Europe/Berlin",
  "Europe/Podgorica": "Europe/Berlin",
  "Europe/Prague": "Europe/Berlin",
  "Europe/Rome": "Europe/Berlin",
  "Europe/San_Marino": "Europe/Berlin",
  "Europe/Sarajevo": "Europe/Berlin",
  "Europe/Skopje": "Europe/Berlin",
  "Europe/Stockholm": "Europe/Berlin",
  "Europe/Tirane": "Europe/Berlin",
  "Europe/Vaduz": "Europe/Berlin",
  "Europe/Vatican": "Europe/Berlin",
  "Europe/Vienna": "Europe/Berlin",
  "Europe/Warsaw": "Europe/Berlin",
  "Europe/Zagreb": "Europe/Berlin",
  "Europe/Guernsey": "Europe/London",
  "Europe/Isle_of_Man": "Europe/London",
  "Europe/Jersey": "Europe/London",
  "America/Detroit": "America/New_York",
  "America/Indiana/Indianapolis": "America/New_York",
  "America/Kentucky/Louisville": "America/New_York",
  "America/Mexico_City": "America/Chicago"
};

export function canonicalizeTimeZone(value: string): string {
  return TIME_ZONE_ALIASES[value] ?? value;
}

export function getTimeZoneOptions(_locale = "en-GB"): TimeZoneOption[] {
  return TIME_ZONE_OPTIONS;
}

export function formatTimeZoneLabel(value: string, _locale: string, fallback = value): string {
  return TIME_ZONE_OPTIONS.find((option) => option.value === canonicalizeTimeZone(value))?.label ?? fallback;
}

export function isSupportedTimeZone(value: string | undefined | null): value is string {
  if (!value) return false;
  try {
    new Intl.DateTimeFormat("en", { timeZone: value }).format();
    return true;
  } catch {
    return false;
  }
}

export function formatMatchTime(value: string | undefined, timeZone: string, locale = "en-GB"): string {
  const date = parseDate(value);
  if (!date) {
    return "Open";
  }

  return new Intl.DateTimeFormat(locale, {
    hour: "2-digit",
    minute: "2-digit",
    timeZone
  }).format(date);
}

export function formatShortDate(value: string | undefined, timeZone: string, locale = "en-GB"): string | null {
  const date = parseDate(value);
  if (!date) {
    return null;
  }

  return new Intl.DateTimeFormat(locale, {
    month: "short",
    day: "numeric",
    timeZone
  }).format(date);
}

export function formatShortDateTime(value: string | undefined, timeZone: string, locale = "en-GB"): string {
  const date = parseDate(value);
  if (!date) {
    return "Date open";
  }

  return new Intl.DateTimeFormat(locale, {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    timeZone
  }).format(date);
}

export function formatFullDay(value: string | undefined, timeZone: string, locale = "en-GB"): string {
  const date = parseDate(value);
  if (!date) {
    return "Date open";
  }

  return new Intl.DateTimeFormat(locale, {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone
  })
    .format(date)
    .replace(",", "");
}

export function getLocalDateKey(value: string | undefined, timeZone: string): string {
  const date = parseDate(value);
  if (!date) {
    return "9999-unknown";
  }

  const parts = new Intl.DateTimeFormat("en-US", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    timeZone
  }).formatToParts(date);
  const partMap = Object.fromEntries(parts.map((part) => [part.type, part.value]));

  return `${partMap.year}-${partMap.month}-${partMap.day}`;
}

function parseDate(value: string | undefined): Date | null {
  if (!value) {
    return null;
  }

  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}
