export const DEFAULT_TIME_ZONE = "Europe/Berlin";

export type TimeZoneOption = {
  value: string;
  label: string;
};

export const TIME_ZONE_OPTIONS: TimeZoneOption[] = [
  { value: "UTC", label: "UTC" },
  { value: "Europe/Berlin", label: "CET" },
  { value: "Europe/London", label: "GMT" },
  { value: "America/New_York", label: "ET" },
  { value: "America/Chicago", label: "CT" },
  { value: "America/Denver", label: "MT" },
  { value: "America/Los_Angeles", label: "PT" },
  { value: "America/Mexico_City", label: "CST" },
  { value: "Asia/Tokyo", label: "JST" },
  { value: "Australia/Sydney", label: "AET" }
];

export function isSupportedTimeZone(value: string | undefined | null): value is string {
  return Boolean(value && TIME_ZONE_OPTIONS.some((option) => option.value === value));
}

export function formatMatchTime(value: string | undefined, timeZone: string): string {
  const date = parseDate(value);
  if (!date) {
    return "Open";
  }

  return new Intl.DateTimeFormat("en-GB", {
    hour: "2-digit",
    minute: "2-digit",
    timeZone
  }).format(date);
}

export function formatShortDate(value: string | undefined, timeZone: string): string | null {
  const date = parseDate(value);
  if (!date) {
    return null;
  }

  return new Intl.DateTimeFormat("en-GB", {
    month: "short",
    day: "numeric",
    timeZone
  }).format(date);
}

export function formatShortDateTime(value: string | undefined, timeZone: string): string {
  const date = parseDate(value);
  if (!date) {
    return "Date open";
  }

  return new Intl.DateTimeFormat("en-GB", {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    timeZone
  }).format(date);
}

export function formatFullDay(value: string | undefined, timeZone: string): string {
  const date = parseDate(value);
  if (!date) {
    return "Date open";
  }

  return new Intl.DateTimeFormat("en-GB", {
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
