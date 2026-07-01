"use client";

import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { DEFAULT_TIME_ZONE, isSupportedTimeZone } from "@/lib/timezone";

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
      setTimeZoneState(stored);
      return;
    }

    const browserTimeZone = Intl.DateTimeFormat().resolvedOptions().timeZone;
    if (isSupportedTimeZone(browserTimeZone)) {
      setTimeZoneState(browserTimeZone);
    }
  }, []);

  const value = useMemo<TimeZoneContextValue>(() => ({
    timeZone,
    setTimeZone: (nextTimeZone: string) => {
      if (!isSupportedTimeZone(nextTimeZone)) {
        return;
      }

      setTimeZoneState(nextTimeZone);
      window.localStorage.setItem(STORAGE_KEY, nextTimeZone);
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
