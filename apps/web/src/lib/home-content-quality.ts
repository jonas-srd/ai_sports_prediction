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

export function isLiveSportMatch(
  match: Pick<SportApiMatch, "date" | "homeScore" | "awayScore" | "status" | "liveProgress">,
  now = Date.now()
): boolean {
  if (isFinishedMatchStatus(match.status) || isUnavailableMatchStatus(match.status)) {
    return false;
  }

  const status = normalizeStatus(match.status);
  const progress = normalizeStatus(match.liveProgress);
  const explicitlyNotStarted = ["ns", "not started", "scheduled", "tbd"].includes(status);
  if (explicitlyNotStarted) {
    return false;
  }

  const liveStatus = [
    "live",
    "in play",
    "in progress",
    "1h",
    "2h",
    "ht",
    "et",
    "bt",
    "p",
    "q1",
    "q2",
    "q3",
    "q4",
    "ot",
    "period",
    "set"
  ].some((label) => status === label || status.includes(label));

  if (liveStatus || progress.length > 0) {
    return true;
  }

  // Only use kickoff time as a narrow fallback when the provider supplies no
  // explicit state. A score with "NS" must never turn a stale row into a live game.
  if (status || !match.date) {
    return false;
  }

  const time = new Date(match.date).getTime();
  return Number.isFinite(time) && time <= now && time >= now - 3 * 60 * 60 * 1000;
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
