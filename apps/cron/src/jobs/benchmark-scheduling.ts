import { randomUUID } from "node:crypto";
import type { ForecastHorizon, MatchRow, SqliteDb } from "@llm-kicktipp/db";

export type TimeBasedForecastHorizon = Extract<ForecastHorizon, "T_24H" | "T_2H">;

export type BenchmarkStage =
  | "group_stage"
  | "round_of_32"
  | "round_of_16"
  | "quarterfinal"
  | "semifinal"
  | "third_place"
  | "final";

export type DueMatchSelection = {
  match: MatchRow;
  scheduledPredictionTimeUtc: string;
  minutesUntilScheduledPrediction: number;
};

export type StageReadiness = {
  stage: BenchmarkStage;
  ready: boolean;
  expectedMatches: number;
  knownMatches: number;
  unknownTeamMatches: string[];
  invalidKickoffMatches: string[];
  matches: MatchRow[];
  reason: string | null;
};

export type SchedulerLock = {
  lockKey: string;
  owner: string;
  acquiredAtUtc: string;
  expiresAtUtc: string;
};

export const HORIZON_OFFSETS_MINUTES: Record<TimeBasedForecastHorizon, number> = {
  T_24H: 1440,
  T_2H: 120
};

export const STAGE_EXPECTED_MATCH_COUNTS: Record<BenchmarkStage, number> = {
  group_stage: 72,
  round_of_32: 16,
  round_of_16: 8,
  quarterfinal: 4,
  semifinal: 2,
  third_place: 1,
  final: 1
};

export function selectDueBenchmarkMatches(
  matches: MatchRow[],
  options: {
    horizon: TimeBasedForecastHorizon;
    now: Date;
    windowBeforeMin: number;
    windowAfterMin: number;
  }
): DueMatchSelection[] {
  const nowMs = options.now.getTime();
  const lowerBoundMs = nowMs - options.windowAfterMin * 60_000;
  const upperBoundMs = nowMs + options.windowBeforeMin * 60_000;

  return matches
    .filter((match) => ["SCHEDULED", "TIMED"].includes(match.status))
    .map((match) => {
      const scheduledPredictionTimeUtc = getScheduledPredictionTimeUtc(match, options.horizon);
      const scheduledMs = new Date(scheduledPredictionTimeUtc).getTime();

      return {
        match,
        scheduledPredictionTimeUtc,
        scheduledMs,
        minutesUntilScheduledPrediction: Math.round((scheduledMs - nowMs) / 60_000)
      };
    })
    .filter((entry) => Number.isFinite(entry.scheduledMs))
    .filter((entry) => entry.scheduledMs >= lowerBoundMs && entry.scheduledMs <= upperBoundMs)
    .sort((left, right) => left.scheduledMs - right.scheduledMs || left.match.id.localeCompare(right.match.id))
    .map(({ scheduledMs: _scheduledMs, ...entry }) => entry);
}

export function getScheduledPredictionTimeUtc(match: MatchRow, horizon: TimeBasedForecastHorizon): string {
  const kickoffMs = new Date(match.utc_date).getTime();
  if (Number.isNaN(kickoffMs)) {
    return "";
  }

  const offsetMinutes = HORIZON_OFFSETS_MINUTES[horizon];

  return new Date(kickoffMs - offsetMinutes * 60_000).toISOString();
}

export function getStageReadiness(matches: MatchRow[], stage: BenchmarkStage): StageReadiness {
  const stageMatches = matches
    .filter((match) => normalizeStage(match.stage ?? match.competition) === stage)
    .filter((match) => ["SCHEDULED", "TIMED"].includes(match.status))
    .sort((left, right) => new Date(left.utc_date).getTime() - new Date(right.utc_date).getTime());
  const expectedMatches = STAGE_EXPECTED_MATCH_COUNTS[stage];
  const unknownTeamMatches = stageMatches
    .filter((match) => !isKnownTeamName(match.home_team) || !isKnownTeamName(match.away_team))
    .map((match) => match.id);
  const invalidKickoffMatches = stageMatches
    .filter((match) => Number.isNaN(new Date(match.utc_date).getTime()))
    .map((match) => match.id);

  let reason: string | null = null;
  if (stageMatches.length !== expectedMatches) {
    reason = `expected ${expectedMatches} matches, found ${stageMatches.length}`;
  } else if (unknownTeamMatches.length > 0) {
    reason = `unknown teams in ${unknownTeamMatches.length} matches`;
  } else if (invalidKickoffMatches.length > 0) {
    reason = `invalid kickoff times in ${invalidKickoffMatches.length} matches`;
  }

  return {
    stage,
    ready: reason === null,
    expectedMatches,
    knownMatches: stageMatches.length,
    unknownTeamMatches,
    invalidKickoffMatches,
    matches: stageMatches,
    reason
  };
}

export function parseBenchmarkStage(value: string | null): BenchmarkStage {
  if (
    value === "group_stage"
    || value === "round_of_32"
    || value === "round_of_16"
    || value === "quarterfinal"
    || value === "semifinal"
    || value === "third_place"
    || value === "final"
  ) {
    return value;
  }

  throw new Error("Invalid --stage. Use group_stage, round_of_32, round_of_16, quarterfinal, semifinal, third_place, or final.");
}

export function parseTimeBasedHorizon(value: string | null): TimeBasedForecastHorizon {
  if (value === "T_24H" || value === "T_2H") {
    return value;
  }

  throw new Error("Invalid --horizon. Use T_24H or T_2H.");
}

export function acquireSchedulerLock(
  db: SqliteDb,
  lockKey: string,
  ttlMs: number,
  owner = randomUUID(),
  now = new Date()
): SchedulerLock | null {
  const acquiredAtUtc = now.toISOString();
  const expiresAtUtc = new Date(now.getTime() + ttlMs).toISOString();

  const result = db.prepare(`
    insert into scheduler_locks (
      lock_key,
      owner,
      acquired_at_utc,
      expires_at_utc,
      updated_at_utc
    )
    values (
      @lock_key,
      @owner,
      @acquired_at_utc,
      @expires_at_utc,
      @updated_at_utc
    )
    on conflict(lock_key) do update set
      owner = excluded.owner,
      acquired_at_utc = excluded.acquired_at_utc,
      expires_at_utc = excluded.expires_at_utc,
      updated_at_utc = excluded.updated_at_utc
    where scheduler_locks.expires_at_utc <= @now_utc
  `).run({
    lock_key: lockKey,
    owner,
    acquired_at_utc: acquiredAtUtc,
    expires_at_utc: expiresAtUtc,
    updated_at_utc: acquiredAtUtc,
    now_utc: acquiredAtUtc
  });

  if (result.changes !== 1) {
    return null;
  }

  return {
    lockKey,
    owner,
    acquiredAtUtc,
    expiresAtUtc
  };
}

export function releaseSchedulerLock(db: SqliteDb, lock: SchedulerLock): void {
  db.prepare(`
    delete from scheduler_locks
    where lock_key = @lock_key and owner = @owner
  `).run({
    lock_key: lock.lockKey,
    owner: lock.owner
  });
}

export function normalizeStage(value?: string | null): BenchmarkStage | "unknown" {
  const normalized = (value ?? "").toLowerCase();
  if (normalized.includes("group_stage")) return "group_stage";
  if (normalized.includes("round_of_32") || normalized.includes("last_32")) return "round_of_32";
  if (normalized.includes("round_of_16") || normalized.includes("last_16")) return "round_of_16";
  if (normalized.includes("quarter")) return "quarterfinal";
  if (normalized.includes("semi")) return "semifinal";
  if (normalized.includes("third")) return "third_place";
  if (normalized.includes("final")) return "final";
  return "unknown";
}

function isKnownTeamName(value: string | null | undefined): boolean {
  const normalized = (value ?? "").trim().toLowerCase();
  if (!normalized) return false;
  if (["tbd", "tba", "unknown", "-", "team 1", "team 2"].includes(normalized)) return false;
  if (normalized.includes("to be decided")) return false;
  if (normalized.startsWith("winner ")) return false;
  if (normalized.startsWith("runner-up ")) return false;
  if (/^[wl]\d+$/i.test(normalized)) return false;
  if (/^[123][a-l]$/i.test(normalized)) return false;
  return true;
}
