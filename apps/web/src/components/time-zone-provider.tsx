"use client";

import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { canonicalizeTimeZone, DEFAULT_TIME_ZONE, isSupportedTimeZone } from "@/lib/timezone";

const STORAGE_KEY = "ai-sports-prediction-time-zone";

type TimeZoneContextValue = {
  timeZone: string;
  setTimeZone: (timeZone: string) => void;
};

const TimeZoneContext = createContext<TimeZoneContextValue | null>(null);

export function TimeZoneProvider({ children }: { children: ReactNode }) {
  const [timeZone, setTimeZoneState] = useState(DEFAULT_TIME_ZONE);

  useEffect(() => {
    const stored = window.localStorage.getItem(STORAGE_KEY);
    if (isSupportedTimeZone(stored)) {
      setTimeZoneState(canonicalizeTimeZone(stored));
      return;
    }

    const browserTimeZone = Intl.DateTimeFormat().resolvedOptions().timeZone;
    setTimeZoneState(isSupportedTimeZone(browserTimeZone) ? canonicalizeTimeZone(browserTimeZone) : DEFAULT_TIME_ZONE);
  }, []);

  const value = useMemo<TimeZoneContextValue>(() => ({
    timeZone,
    setTimeZone: (nextTimeZone: string) => {
      if (!isSupportedTimeZone(nextTimeZone)) {
        return;
      }

      const canonicalTimeZone = canonicalizeTimeZone(nextTimeZone);
      setTimeZoneState(canonicalTimeZone);
      window.localStorage.setItem(STORAGE_KEY, canonicalTimeZone);
    }
  }), [timeZone]);

  return (
    <TimeZoneContext.Provider value={value}>
      {children}
    </TimeZoneContext.Provider>
  );
}

export function useTimeZone(): TimeZoneContextValue {
  const context = useContext(TimeZoneContext);
  if (!context) {
    throw new Error("useTimeZone must be used inside TimeZoneProvider");
  }

  return context;
}
