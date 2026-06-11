"use client";

/**
 * Purpose: Interactive schedule body for the Matches page.
 * It applies the same prediction-view filters as Home before match cards render.
 */
import { useMemo, useState } from "react";
import type { DashboardMatch } from "@/lib/dashboard-data";
import { getDisplayMatch } from "@/lib/match-display";
import {
  filterMatchesForPredictionView,
  getDefaultPredictionViewState,
  getPredictionViewOptions,
  type PredictionViewState
} from "@/lib/prediction-view";
import { MatchPredictionCard } from "@/components/match-prediction-card";
import { PredictionViewControls } from "@/components/prediction-view-controls";
import { formatFullDay, formatMatchTime, getLocalDateKey } from "@/lib/timezone";
import { useTimeZone } from "@/components/time-zone-provider";

type MatchesScheduleProps = {
  matches: DashboardMatch[];
};

type ScheduleDay = {
  key: string;
  label: string;
  matches: DashboardMatch[];
};

export function MatchesSchedule({ matches }: MatchesScheduleProps) {
  const { timeZone } = useTimeZone();
  const options = useMemo(() => getPredictionViewOptions(matches), [matches]);
  const [viewState, setViewState] = useState<PredictionViewState>(() => getDefaultPredictionViewState(options));
  const filteredMatches = useMemo(
    () => filterMatchesForPredictionView(matches, viewState),
    [matches, viewState]
  );
  const scheduleDays = useMemo(() => groupMatchesByDay(filteredMatches, timeZone), [filteredMatches, timeZone]);

  return (
    <section className="scheduleList">
      {scheduleDays.map((day) => (
        <section className="scheduleDay" key={day.key}>
          <div className="scheduleDayHeader">
            <h2>{day.label}</h2>
            <span>{formatScheduleDayTag(day.matches)}</span>
          </div>
          <div className="scheduleDayMatches">
            {day.matches.map((match) => {
              const displayMatch = getDisplayMatch(match, filteredMatches);
              return (
                <MatchPredictionCard
                  className="scheduleMatchCard"
                  key={match.id}
                  match={displayMatch}
                  center={formatMatchCenter(match, timeZone)}
                  meta={formatMatchMeta(match)}
                  predictionControls={
                    <PredictionViewControls
                      options={options}
                      state={viewState}
                      summary=""
                      variant="embedded"
                      onChange={setViewState}
                    />
                  }
                />
              );
            })}
          </div>
        </section>
      ))}
    </section>
  );
}

function groupMatchesByDay(matches: DashboardMatch[], timeZone: string): ScheduleDay[] {
  const days = new Map<string, ScheduleDay>();

  for (const match of matches) {
    const key = getDayKey(match, timeZone);
    const day = days.get(key) ?? {
      key,
      label: formatDayLabel(match.utcDate, timeZone),
      matches: []
    };

    day.matches.push(match);
    days.set(key, day);
  }

  return [...days.values()]
    .map((day) => ({
      ...day,
      matches: day.matches.sort(compareMatches)
    }))
    .sort((a, b) => compareDateKeys(a.key, b.key));
}

function isKnockoutMatch(match: DashboardMatch): boolean {
  const competition = match.competition ?? "";
  return !competition.includes("GROUP_STAGE");
}

function formatScheduleDayTag(matches: DashboardMatch[]): string {
  if (matches.length > 0 && matches.every(isKnockoutMatch)) {
    return "Knockout";
  }

  if (matches.some(isKnockoutMatch)) {
    return "Mixed day";
  }

  return "View groups";
}

function compareMatches(a: DashboardMatch, b: DashboardMatch): number {
  return getTimeValue(a.utcDate) - getTimeValue(b.utcDate);
}

function compareDateKeys(a: string, b: string): number {
  return a.localeCompare(b);
}

function getDayKey(match: DashboardMatch, timeZone: string): string {
  return getLocalDateKey(match.utcDate, timeZone);
}

function getTimeValue(value?: string): number {
  if (!value) {
    return Number.MAX_SAFE_INTEGER;
  }

  const time = new Date(value).getTime();
  return Number.isNaN(time) ? Number.MAX_SAFE_INTEGER : time;
}

function formatDayLabel(value: string | undefined, timeZone: string): string {
  return formatFullDay(value, timeZone);
}

function formatMatchCenter(match: DashboardMatch, timeZone: string): string {
  if (match.actualHome !== null && match.actualAway !== null) {
    return `${match.actualHome} - ${match.actualAway}`;
  }

  return formatMatchTime(match.utcDate, timeZone);
}

function formatMatchMeta(match: DashboardMatch): string | null {
  const details = [formatCompetition(match.competition), match.venue].filter(Boolean);
  return details.length > 0 ? details.join(" - ") : null;
}

function formatCompetition(value?: string): string | null {
  if (!value) {
    return null;
  }

  const details: string[] = [];

  if (value.includes("GROUP_STAGE")) {
    details.push("Group stage");
  } else if (value.includes("LAST_32")) {
    details.push("Round of 32");
  } else if (value.includes("LAST_16")) {
    details.push("Round of 16");
  } else if (value.includes("QUARTER_FINALS")) {
    details.push("Quarter-finals");
  } else if (value.includes("SEMI_FINALS")) {
    details.push("Semi-finals");
  } else if (value.includes("THIRD_PLACE")) {
    details.push("Third place");
  } else if (value.includes("FINAL")) {
    details.push("Final");
  }

  const group = value.match(/GROUP_([A-L])/);
  if (group) {
    details.push(`Group ${group[1]}`);
  }

  if (details.length > 0) {
    return details.join(" - ");
  }

  return value.replace("FIFA World Cup", "World Cup");
}
