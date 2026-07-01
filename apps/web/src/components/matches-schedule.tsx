"use client";

/**
 * Purpose: Interactive schedule body for the Matches page.
 * It applies the same prediction-view filters as Home before match cards render.
 */
import { useEffect, useMemo, useRef, useState } from "react";
import type { DashboardMatch } from "@/lib/dashboard-types";
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
import type { Locale } from "@/lib/i18n";

type MatchesScheduleProps = {
  locale: Locale;
  matches: DashboardMatch[];
};

type ScheduleDay = {
  key: string;
  label: string;
  matches: DashboardMatch[];
};

const SCHEDULE_TEXT = {
  en: {
    knockout: "Knockout",
    mixedDay: "Mixed day",
    viewGroups: "View groups",
    groupStage: "Group stage",
    roundOf32: "Round of 32",
    roundOf16: "Round of 16",
    quarterFinals: "Quarter-finals",
    semiFinals: "Semi-finals",
    thirdPlace: "Third place",
    final: "Final"
  },
  de: {
    knockout: "K.-o.-Phase",
    mixedDay: "Gemischter Tag",
    viewGroups: "Gruppen ansehen",
    groupStage: "Gruppenphase",
    roundOf32: "Runde der 32",
    roundOf16: "Achtelfinale",
    quarterFinals: "Viertelfinale",
    semiFinals: "Halbfinale",
    thirdPlace: "Spiel um Platz 3",
    final: "Finale"
  }
} as const;

export function MatchesSchedule({ locale, matches }: MatchesScheduleProps) {
  const { timeZone } = useTimeZone();
  const dayRefs = useRef(new Map<string, HTMLElement>());
  const lastAutoScrolledKey = useRef<string | null>(null);
  const options = useMemo(() => getPredictionViewOptions(matches), [matches]);
  const [viewState, setViewState] = useState<PredictionViewState>(() => getDefaultPredictionViewState(options));
  const [initialDayKey, setInitialDayKey] = useState<string | null>(null);
  const filteredMatches = useMemo(
    () => filterMatchesForPredictionView(matches, viewState),
    [matches, viewState]
  );
  const scheduleDays = useMemo(() => groupMatchesByDay(filteredMatches, timeZone, locale), [filteredMatches, timeZone, locale]);

  useEffect(() => {
    setInitialDayKey(getInitialScheduleDayKey(scheduleDays, timeZone));
  }, [scheduleDays, timeZone]);

  useEffect(() => {
    if (window.location.hash) {
      return;
    }

    if (!initialDayKey) {
      return;
    }

    const scrollKey = `${timeZone}:${initialDayKey}`;
    if (lastAutoScrolledKey.current === scrollKey) {
      return;
    }

    lastAutoScrolledKey.current = scrollKey;
    const timeoutId = window.setTimeout(() => {
      dayRefs.current.get(initialDayKey)?.scrollIntoView({ block: "start" });
    }, 0);

    return () => window.clearTimeout(timeoutId);
  }, [initialDayKey, timeZone]);

  return (
    <section className="scheduleList">
      {scheduleDays.map((day) => (
        <section
          className="scheduleDay"
          data-initial-scroll-target={day.key === initialDayKey ? "true" : undefined}
          data-day-key={day.key}
          key={day.key}
          ref={(node) => {
            if (node) {
              dayRefs.current.set(day.key, node);
            } else {
              dayRefs.current.delete(day.key);
            }
          }}
        >
          <div className="scheduleDayHeader">
            <h2>{day.label}</h2>
            <span>{formatScheduleDayTag(day.matches, locale)}</span>
          </div>
          <div className="scheduleDayMatches">
            {day.matches.map((match) => {
              const displayMatch = getDisplayMatch(match, filteredMatches);
              return (
                <MatchPredictionCard
                  className="scheduleMatchCard"
                  key={match.id}
                  locale={locale}
                  match={displayMatch}
                  center={formatMatchCenter(match, timeZone)}
                  meta={formatMatchMeta(match, locale)}
                  predictionControls={
                    <PredictionViewControls
                      locale={locale}
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

function groupMatchesByDay(matches: DashboardMatch[], timeZone: string, locale: Locale): ScheduleDay[] {
  const days = new Map<string, ScheduleDay>();

  for (const match of matches) {
    const key = getDayKey(match, timeZone);
    const day = days.get(key) ?? {
      key,
      label: formatDayLabel(match.utcDate, timeZone, locale),
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

function getInitialScheduleDayKey(days: ScheduleDay[], timeZone: string): string | null {
  if (days.length === 0) {
    return null;
  }

  const todayKey = getLocalDateKey(new Date().toISOString(), timeZone);
  const today = days.find((day) => day.key === todayKey);
  if (today) {
    return today.key;
  }

  const nextMatchDay = days.find((day) => compareDateKeys(day.key, todayKey) > 0);
  return nextMatchDay?.key ?? days[days.length - 1]?.key ?? null;
}

function isKnockoutMatch(match: DashboardMatch): boolean {
  const competition = match.competition ?? "";
  return !competition.includes("GROUP_STAGE");
}

function formatScheduleDayTag(matches: DashboardMatch[], locale: Locale): string {
  const text = SCHEDULE_TEXT[locale];
  if (matches.length > 0 && matches.every(isKnockoutMatch)) {
    return text.knockout;
  }

  if (matches.some(isKnockoutMatch)) {
    return text.mixedDay;
  }

  return text.viewGroups;
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

function formatDayLabel(value: string | undefined, timeZone: string, locale: Locale): string {
  return formatFullDay(value, timeZone, locale === "de" ? "de-DE" : "en-GB");
}

function formatMatchCenter(match: DashboardMatch, timeZone: string): string {
  if (match.actualHome !== null && match.actualAway !== null) {
    return `${match.actualHome} - ${match.actualAway}`;
  }

  return formatMatchTime(match.utcDate, timeZone);
}

function formatMatchMeta(match: DashboardMatch, locale: Locale): string | null {
  const details = [formatCompetition(match.competition, locale), match.venue].filter(Boolean);
  return details.length > 0 ? details.join(" - ") : null;
}

function formatCompetition(value: string | undefined, locale: Locale): string | null {
  if (!value) {
    return null;
  }

  const text = SCHEDULE_TEXT[locale];
  const details: string[] = [];

  if (value.includes("GROUP_STAGE")) {
    details.push(text.groupStage);
  } else if (value.includes("LAST_32")) {
    details.push(text.roundOf32);
  } else if (value.includes("LAST_16")) {
    details.push(text.roundOf16);
  } else if (value.includes("QUARTER_FINALS")) {
    details.push(text.quarterFinals);
  } else if (value.includes("SEMI_FINALS")) {
    details.push(text.semiFinals);
  } else if (value.includes("THIRD_PLACE")) {
    details.push(text.thirdPlace);
  } else if (value.includes("FINAL")) {
    details.push(text.final);
  }

  const group = value.match(/GROUP_([A-L])/);
  if (group) {
    details.push(`${locale === "de" ? "Gruppe" : "Group"} ${group[1]}`);
  }

  if (details.length > 0) {
    return details.join(" - ");
  }

  return value.replace("FIFA World Cup", "World Cup");
}
