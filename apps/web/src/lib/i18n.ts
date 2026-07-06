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
    mainNavigation: "Main navigation",
    sportsNavigation: "Sports navigation",
    menu: "Menu",
    search: "Search",
    forecasts: "Predictions",
    liveResults: "Live & results",
    newsticker: "Ticker",
    background: "Background",
    sports: "Sports",
    home: "Home",
    about: "About",
    bracket: "Tournaments",
    legalNotice: "Legal Notice",
    football: "Football",
    tennis: "Tennis",
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
    mainNavigation: "Hauptnavigation",
    sportsNavigation: "Sportarten",
    menu: "Menü",
    search: "Suche",
    forecasts: "Prognosen",
    liveResults: "Live & Ergebnisse",
    newsticker: "Newsticker",
    background: "Hintergrund",
    sports: "Sportarten",
    home: "Start",
    about: "Info",
    bracket: "Turniere",
    legalNotice: "Impressum",
    football: "Fußball",
    tennis: "Tennis",
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
      eyebrow: "AI Sport Prediction",
      title: "AI predictions for football, NFL, NBA and tennis.",
      description: "A dark, fast sports intelligence hub for model forecasts, live form signals, upset alerts and transparent result checks across the biggest sports.",
      cta: "Explore sports"
    },
    matches: {
      eyebrow: "Match Center",
      title: "Matches, scores and model picks",
      description: "Fixtures, model forecasts and result checks in one match center."
    },
    analytics: {
      eyebrow: "AI Performance",
      title: "Prediction analytics",
      description: "Compare model accuracy, confidence, reliability and sports-specific signal quality across prediction runs."
    }
  },
  de: {
    home: {
      eyebrow: "AI Sport Prediction",
      title: "KI-Prognosen für Fußball, NFL, NBA und Tennis.",
      description: "Ein dunkles, schnelles Sport-Intelligence-Dashboard für Modellprognosen, Formsignale, Upset-Alerts und transparente Ergebnischecks.",
      cta: "Sportarten entdecken"
    },
    matches: {
      eyebrow: "Match Center",
      title: "Spiele, Scores und Modelltipps",
      description: "Fixtures, Modellprognosen und Ergebnischecks in einem Match Center."
    },
    analytics: {
      eyebrow: "KI-Performance",
      title: "Prediction Analytics",
      description: "Vergleiche Modellgenauigkeit, Konfidenz, Zuverlässigkeit und sportartspezifische Signalqualität."
    }
  }
} as const;
