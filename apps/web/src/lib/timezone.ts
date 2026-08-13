export const DEFAULT_TIME_ZONE = "UTC";

export type TimeZoneOption = {
  value: string;
  label: string;
};

export const TIME_ZONE_OPTIONS: TimeZoneOption[] = [
  { value: "UTC", label: "Coordinated Universal Time (UTC)" },
  { value: "Europe/London", label: "United Kingdom (London)" },
  { value: "Europe/Berlin", label: "Central European Time (Berlin)" },
  { value: "Europe/Paris", label: "Central European Time (Paris)" },
  { value: "Europe/Madrid", label: "Central European Time (Madrid)" },
  { value: "Europe/Rome", label: "Central European Time (Rome)" },
  { value: "Europe/Lisbon", label: "Western European Time (Lisbon)" },
  { value: "America/New_York", label: "Eastern Time (New York)" },
  { value: "America/Chicago", label: "Central Time (Chicago)" },
  { value: "America/Denver", label: "Mountain Time (Denver)" },
  { value: "America/Los_Angeles", label: "Pacific Time (Los Angeles)" },
  { value: "America/Mexico_City", label: "Central Time (Mexico City)" },
  { value: "America/Sao_Paulo", label: "Brasília Time (São Paulo)" },
  { value: "America/Argentina/Buenos_Aires", label: "Argentina Time (Buenos Aires)" },
  { value: "Asia/Dubai", label: "Gulf Standard Time (Dubai)" },
  { value: "Asia/Kolkata", label: "India Standard Time (Kolkata)" },
  { value: "Asia/Singapore", label: "Singapore Time" },
  { value: "Asia/Tokyo", label: "Japan Standard Time (Tokyo)" },
  { value: "Australia/Sydney", label: "Australian Eastern Time (Sydney)" },
  { value: "Pacific/Auckland", label: "New Zealand Time (Auckland)" }
];

export function getTimeZoneOptions(locale = "en-GB"): TimeZoneOption[] {
  return TIME_ZONE_OPTIONS.map((option) => ({
    ...option,
    label: formatTimeZoneLabel(option.value, locale, option.label)
  }));
}

export function formatTimeZoneLabel(value: string, locale: string, fallback = value): string {
  if (value === "UTC") return fallback;
  try {
    const city = value.split("/").at(-1)?.replaceAll("_", " ") ?? value;
    const longName = new Intl.DateTimeFormat(locale, { timeZone: value, timeZoneName: "long" })
      .formatToParts(new Date())
      .find((part) => part.type === "timeZoneName")?.value;
    return longName ? `${longName} (${city})` : fallback;
  } catch {
    return fallback;
  }
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
