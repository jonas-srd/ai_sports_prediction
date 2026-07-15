import type { SportApiMatch } from "@/lib/sports-api-data";

const FINISHED_STATUS_LABELS = [
  "finished",
  "full time",
  "fulltime",
  "after extra time",
  "after penalties",
  "match finished",
  "ft",
  "aet",
  "aot",
  "pen",
  "final"
];

const UNAVAILABLE_STATUS_LABELS = [
  "cancelled",
  "canceled",
  "postponed",
  "suspended",
  "abandoned"
];

export function isFinishedMatchStatus(status: string | null | undefined): boolean {
  const normalized = normalizeStatus(status);
  return normalized.length > 0 && FINISHED_STATUS_LABELS.some((label) => normalized === label || normalized.includes(label));
}

export function isUnavailableMatchStatus(status: string | null | undefined): boolean {
  const normalized = normalizeStatus(status);
  return normalized.length > 0 && UNAVAILABLE_STATUS_LABELS.some((label) => normalized === label || normalized.includes(label));
}

export function isUpcomingPredictionMatch(match: Pick<SportApiMatch, "date" | "status">, now = Date.now()): boolean {
  if (isFinishedMatchStatus(match.status) || isUnavailableMatchStatus(match.status) || !match.date) {
    return false;
  }

  const time = new Date(match.date).getTime();
  if (Number.isNaN(time)) {
    return false;
  }

  // A small grace window avoids a card disappearing during the final seconds
  // before the live feed changes the fixture status.
  return time >= now - 20 * 60 * 1000;
}

function normalizeStatus(status: string | null | undefined): string {
  return String(status ?? "").trim().toLowerCase();
}
