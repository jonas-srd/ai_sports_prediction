export type Locale = "en" | "de";
export type SiteLocale = "en" | "de" | "es" | "pt" | "fr" | "it";

export const DEFAULT_LOCALE: Locale = "en";
export const SUPPORTED_LOCALES: SiteLocale[] = ["en", "de", "es", "pt", "fr", "it"];

export const LOCALE_LABELS: Record<SiteLocale, string> = {
  en: "English",
  de: "Deutsch",
  es: "Español",
  pt: "Português",
  fr: "Français",
  it: "Italiano"
};

export const INTL_LOCALES: Record<SiteLocale, string> = {
  en: "en-GB",
  de: "de-DE",
  es: "es-ES",
  pt: "pt-PT",
  fr: "fr-FR",
  it: "it-IT"
};

export function isSiteLocale(value: string | undefined | null): value is SiteLocale {
  return Boolean(value && SUPPORTED_LOCALES.includes(value as SiteLocale));
}

export function isLocale(value: string | undefined | null): value is Locale {
  return value === "en" || value === "de";
}

export function getLocaleFromPathname(pathname: string | null | undefined): Locale {
  return getSiteLocaleFromPathname(pathname) === "de" ? "de" : DEFAULT_LOCALE;
}

export function getSiteLocaleFromPathname(pathname: string | null | undefined): SiteLocale {
  if (!pathname) {
    return DEFAULT_LOCALE;
  }

  const segment = pathname.split("/").filter(Boolean)[0];
  return isSiteLocale(segment) ? segment : DEFAULT_LOCALE;
}

export function stripLocalePrefix(pathname: string): string {
  const match = pathname.match(/^\/([^/]+)(\/.*)?$/);
  if (match && isSiteLocale(match[1])) {
    return match[2] || "/";
  }

  return pathname || "/";
}

export function localizePath(path: string, locale: SiteLocale): string {
  const normalizedPath = path.startsWith("/") ? path : `/${path}`;
  const unprefixedPath = stripLocalePrefix(normalizedPath);

  if (locale !== DEFAULT_LOCALE) {
    return unprefixedPath === "/" ? `/${locale}` : `/${locale}${unprefixedPath}`;
  }

  return unprefixedPath;
}

export function switchLocalePath(pathname: string, locale: SiteLocale): string {
  return localizePath(stripLocalePrefix(pathname), locale);
}

export function getIntlLocale(locale: SiteLocale): string {
  return INTL_LOCALES[locale];
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
  },
  es: {
    language: "Idioma", timezone: "Zona horaria", displayLanguage: "Idioma de visualización", displayTimezone: "Zona horaria de visualización",
    mainNavigation: "Navegación principal", sportsNavigation: "Deportes", menu: "Menú", search: "Buscar", forecasts: "Predicciones",
    liveResults: "En directo y resultados", newsticker: "Noticias", background: "Contexto", sports: "Deportes", home: "Inicio", about: "Acerca de",
    bracket: "Torneos", legalNotice: "Aviso legal", football: "Fútbol", tennis: "Tenis", scores: "puntos", score: "punto", pending: "pendiente",
    open: "abierto", tbd: "Por determinar", noData: "Sin datos", noDataYet: "Aún no hay datos", noPick: "sin pronóstico", pick: "Pronóstico",
    final: "Final", result: "Resultado", predictions: "Predicciones", modelPicks: "pronósticos del modelo", setup: "Configuración", question: "Pregunta",
    reason: "Motivo", reasoning: "Análisis", confidence: "Confianza", validation: "Validación", evaluation: "Evaluación", stageCoverage: "Cobertura de fases"
  },
  pt: {
    language: "Idioma", timezone: "Fuso horário", displayLanguage: "Idioma de apresentação", displayTimezone: "Fuso horário de apresentação",
    mainNavigation: "Navegação principal", sportsNavigation: "Desportos", menu: "Menu", search: "Pesquisar", forecasts: "Previsões",
    liveResults: "Ao vivo e resultados", newsticker: "Notícias", background: "Contexto", sports: "Desportos", home: "Início", about: "Sobre",
    bracket: "Torneios", legalNotice: "Aviso legal", football: "Futebol", tennis: "Ténis", scores: "pontos", score: "ponto", pending: "pendente",
    open: "em aberto", tbd: "A definir", noData: "Sem dados", noDataYet: "Ainda sem dados", noPick: "sem previsão", pick: "Previsão",
    final: "Final", result: "Resultado", predictions: "Previsões", modelPicks: "previsões do modelo", setup: "Configuração", question: "Pergunta",
    reason: "Motivo", reasoning: "Análise", confidence: "Confiança", validation: "Validação", evaluation: "Avaliação", stageCoverage: "Cobertura das fases"
  },
  fr: {
    language: "Langue", timezone: "Fuseau horaire", displayLanguage: "Langue d’affichage", displayTimezone: "Fuseau horaire d’affichage",
    mainNavigation: "Navigation principale", sportsNavigation: "Sports", menu: "Menu", search: "Rechercher", forecasts: "Prédictions",
    liveResults: "Direct et résultats", newsticker: "Actualités", background: "Contexte", sports: "Sports", home: "Accueil", about: "À propos",
    bracket: "Tournois", legalNotice: "Mentions légales", football: "Football", tennis: "Tennis", scores: "points", score: "point", pending: "en attente",
    open: "ouvert", tbd: "À déterminer", noData: "Aucune donnée", noDataYet: "Pas encore de données", noPick: "aucun pronostic", pick: "Pronostic",
    final: "Terminé", result: "Résultat", predictions: "Prédictions", modelPicks: "pronostics du modèle", setup: "Configuration", question: "Question",
    reason: "Motif", reasoning: "Analyse", confidence: "Confiance", validation: "Validation", evaluation: "Évaluation", stageCoverage: "Couverture des phases"
  },
  it: {
    language: "Lingua", timezone: "Fuso orario", displayLanguage: "Lingua di visualizzazione", displayTimezone: "Fuso orario di visualizzazione",
    mainNavigation: "Navigazione principale", sportsNavigation: "Sport", menu: "Menu", search: "Cerca", forecasts: "Pronostici",
    liveResults: "Live e risultati", newsticker: "Notizie", background: "Contesto", sports: "Sport", home: "Home", about: "Chi siamo",
    bracket: "Tornei", legalNotice: "Note legali", football: "Calcio", tennis: "Tennis", scores: "punti", score: "punto", pending: "in attesa",
    open: "aperto", tbd: "Da definire", noData: "Nessun dato", noDataYet: "Nessun dato disponibile", noPick: "nessun pronostico", pick: "Pronostico",
    final: "Finale", result: "Risultato", predictions: "Pronostici", modelPicks: "pronostici del modello", setup: "Configurazione", question: "Domanda",
    reason: "Motivo", reasoning: "Analisi", confidence: "Affidabilità", validation: "Validazione", evaluation: "Valutazione", stageCoverage: "Copertura delle fasi"
  }
} as const;

export const routeText = {
  en: {
    home: {
      eyebrow: "Residual Sports",
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
      eyebrow: "Residual Sports",
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
  },
  es: {
    home: { eyebrow: "Residual Sports", title: "Predicciones de IA para fútbol, NFL, NBA y tenis.", description: "Análisis deportivo rápido y transparente con predicciones, señales de forma y comprobación de resultados.", cta: "Explorar deportes" },
    matches: { eyebrow: "Centro de partidos", title: "Partidos, resultados y pronósticos", description: "Calendario, predicciones del modelo y resultados en un solo lugar." },
    analytics: { eyebrow: "Rendimiento de IA", title: "Análisis de predicciones", description: "Compara precisión, confianza, fiabilidad y calidad de las señales por deporte." }
  },
  pt: {
    home: { eyebrow: "Residual Sports", title: "Previsões de IA para futebol, NFL, NBA e ténis.", description: "Análise desportiva rápida e transparente com previsões, sinais de forma e verificação de resultados.", cta: "Explorar desportos" },
    matches: { eyebrow: "Centro de jogos", title: "Jogos, resultados e previsões", description: "Calendário, previsões do modelo e resultados num único lugar." },
    analytics: { eyebrow: "Desempenho da IA", title: "Análise de previsões", description: "Compare precisão, confiança, fiabilidade e qualidade dos sinais por desporto." }
  },
  fr: {
    home: { eyebrow: "Residual Sports", title: "Prédictions IA pour le football, la NFL, la NBA et le tennis.", description: "Une analyse sportive rapide et transparente avec prédictions, signaux de forme et vérification des résultats.", cta: "Explorer les sports" },
    matches: { eyebrow: "Centre des matchs", title: "Matchs, scores et pronostics", description: "Calendrier, prédictions du modèle et résultats au même endroit." },
    analytics: { eyebrow: "Performance de l’IA", title: "Analyse des prédictions", description: "Comparez précision, confiance, fiabilité et qualité des signaux par sport." }
  },
  it: {
    home: { eyebrow: "Residual Sports", title: "Pronostici IA per calcio, NFL, NBA e tennis.", description: "Analisi sportiva rapida e trasparente con pronostici, segnali di forma e verifica dei risultati.", cta: "Esplora gli sport" },
    matches: { eyebrow: "Centro partite", title: "Partite, risultati e pronostici", description: "Calendario, pronostici del modello e risultati in un unico posto." },
    analytics: { eyebrow: "Prestazioni IA", title: "Analisi dei pronostici", description: "Confronta precisione, affidabilità e qualità dei segnali per sport." }
  }
} as const;
