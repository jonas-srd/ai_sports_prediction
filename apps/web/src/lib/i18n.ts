export type Locale = "en" | "de";

export const DEFAULT_LOCALE: Locale = "en";
export const SUPPORTED_LOCALES: Locale[] = ["en", "de"];

export const LOCALE_LABELS: Record<Locale, string> = {
  en: "EN",
  de: "DE"
};

export function isLocale(value: string | undefined | null): value is Locale {
  return value === "en" || value === "de";
}

export function getLocaleFromPathname(pathname: string | null | undefined): Locale {
  if (!pathname) {
    return DEFAULT_LOCALE;
  }

  return pathname === "/de" || pathname.startsWith("/de/") ? "de" : DEFAULT_LOCALE;
}

export function stripLocalePrefix(pathname: string): string {
  if (pathname === "/de") {
    return "/";
  }

  if (pathname.startsWith("/de/")) {
    return pathname.slice(3) || "/";
  }

  return pathname || "/";
}

export function localizePath(path: string, locale: Locale): string {
  const normalizedPath = path.startsWith("/") ? path : `/${path}`;
  const unprefixedPath = stripLocalePrefix(normalizedPath);

  if (locale === "de") {
    return unprefixedPath === "/" ? "/de" : `/de${unprefixedPath}`;
  }

  return unprefixedPath;
}

export function switchLocalePath(pathname: string, locale: Locale): string {
  return localizePath(stripLocalePrefix(pathname), locale);
}

export function formatCount(
  value: number,
  labels: Record<Locale, { singular: string; plural: string }>,
  locale: Locale
): string {
  const label = value === 1 ? labels[locale].singular : labels[locale].plural;
  return `${value} ${label}`;
}

export const commonText = {
  en: {
    language: "Language",
    timezone: "Timezone",
    displayLanguage: "Display language",
    displayTimezone: "Display timezone",
    home: "Home",
    about: "About",
    bracket: "World Cup Bracket",
    matches: "Matches",
    analytics: "Analytics",
    legalNotice: "Legal Notice",
    scores: "points",
    score: "point",
    pending: "pending",
    open: "open",
    tbd: "TBD",
    noData: "No data",
    noDataYet: "No data yet",
    noPick: "no pick",
    pick: "Pick",
    final: "Final",
    result: "Result",
    predictions: "Predictions",
    modelPicks: "model picks",
    setup: "Setup",
    question: "Question",
    reason: "Reason",
    reasoning: "Reasoning",
    confidence: "Confidence",
    validation: "Validation",
    evaluation: "Evaluation",
    stageCoverage: "Stage coverage"
  },
  de: {
    language: "Sprache",
    timezone: "Zeitzone",
    displayLanguage: "Anzeigesprache",
    displayTimezone: "Anzeigezeitzone",
    home: "Start",
    about: "Info",
    bracket: "WM-Turnierbaum",
    matches: "Spiele",
    analytics: "Analyse",
    legalNotice: "Impressum",
    scores: "Punkte",
    score: "Punkt",
    pending: "offen",
    open: "offen",
    tbd: "offen",
    noData: "Keine Daten",
    noDataYet: "Noch keine Daten",
    noPick: "kein Tipp",
    pick: "Tipp",
    final: "Endstand",
    result: "Ergebnis",
    predictions: "Vorhersagen",
    modelPicks: "Modelltipps",
    setup: "Setup",
    question: "Frage",
    reason: "Begründung",
    reasoning: "Begründung",
    confidence: "Konfidenz",
    validation: "Validierung",
    evaluation: "Auswertung",
    stageCoverage: "Phasenabdeckung"
  }
} as const;

export const routeText = {
  en: {
    home: {
      eyebrow: "LLM SoccerArena",
      title: "Which model predicts the FIFA World Cup 2026 best?",
      description: "World Cup 2026 forecasts from multiple LLMs, ranked with benchmark evaluation metrics.",
      cta: "View all matches"
    },
    matches: {
      eyebrow: "World Cup 2026",
      title: "Schedule",
      description: "All fixtures by day. Click any match to inspect model picks."
    },
    analytics: {
      eyebrow: "WorldCupForecastBench 2026",
      title: "Analytics",
      description: "Compare model performance across horizons, access conditions, prompt strategies, stages, and reliability metrics."
    }
  },
  de: {
    home: {
      eyebrow: "LLM SoccerArena",
      title: "Welches Modell tippt die FIFA-Weltmeisterschaft 2026 am besten?",
      description: "WM-2026-Prognosen mehrerer LLMs, bewertet mit Benchmark-Metriken.",
      cta: "Alle Spiele ansehen"
    },
    matches: {
      eyebrow: "WM 2026",
      title: "Spielplan",
      description: "Alle Spiele nach Tag. Klicke auf ein Spiel, um Modelltipps zu sehen."
    },
    analytics: {
      eyebrow: "WorldCupForecastBench 2026",
      title: "Analyse",
      description: "Vergleiche Modellleistung nach Horizont, Zugriff, Prompt-Strategie, Turnierphase und Zuverlässigkeitsmetriken."
    }
  }
} as const;
