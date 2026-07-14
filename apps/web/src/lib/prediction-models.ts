import type { ApiSportId } from "@/lib/sports-api-data";
import type { Locale } from "@/lib/i18n";

export type PredictionModelId = "nexus" | "pulse" | "edge";

export type PredictionProbability = {
  label: "home" | "draw" | "away";
  name: string;
  value: number;
};

export type ModelPrediction = {
  confidence: number;
  model: PredictionModelId;
  pick: string;
  probabilities: PredictionProbability[];
  reason: string;
  score: string;
};

export type ModelPredictionSet = Record<PredictionModelId, ModelPrediction>;

export const PREDICTION_MODELS: Array<{
  id: PredictionModelId;
  name: string;
  accent: string;
  description: Record<Locale, string>;
}> = [
  {
    id: "nexus",
    name: "NEXUS",
    accent: "#7df5c1",
    description: {
      de: "Langfristige Stärke, Rankings und historische Vergleichsdaten",
      en: "Long-term strength, rankings and historical comparison data"
    }
  },
  {
    id: "pulse",
    name: "PULSE",
    accent: "#58d8ff",
    description: {
      de: "Aktuelle Form, Belastung und kurzfristige Dynamik",
      en: "Current form, workload and short-term momentum"
    }
  },
  {
    id: "edge",
    name: "EDGE",
    accent: "#ffc857",
    description: {
      de: "Matchups, situative Vorteile und Markt-Kontext",
      en: "Matchups, situational advantages and market context"
    }
  }
];

export function buildModelPredictions(input: {
  baseConfidence: number;
  basePick: string;
  baseReason?: string;
  baseScore: string;
  homeName: string;
  awayName: string;
  locale: Locale;
  seed: number;
  sport: ApiSportId;
}): ModelPredictionSet {
  const confidenceByModel = buildDistinctConfidences(input.baseConfidence, input.seed, input.sport);

  return Object.fromEntries(PREDICTION_MODELS.map((model, index) => {
    const probabilities = buildProbabilities({
      confidence: confidenceByModel[model.id],
      homeName: input.homeName,
      awayName: input.awayName,
      model: model.id,
      pick: input.basePick,
      seed: input.seed,
      sport: input.sport
    });
    const selectedProbability = probabilities.find((row) => namesMatch(row.name, input.basePick))
      ?? (isDrawPick(input.basePick) ? probabilities.find((row) => row.label === "draw") : undefined)
      ?? probabilities.reduce((best, row) => row.value > best.value ? row : best);
    const displayPick = selectedProbability.label === "draw"
      ? (input.locale === "de" ? "Remis" : "Draw")
      : selectedProbability.name;

    return [model.id, {
      confidence: selectedProbability.value,
      model: model.id,
      pick: displayPick,
      probabilities,
      reason: buildReason(model.id, input.sport, input.locale, displayPick),
      score: adjustScore(input.baseScore, input.sport, model.id, selectedProbability.label, input.seed + index)
    } satisfies ModelPrediction];
  })) as ModelPredictionSet;
}

export function getPredictionModel(modelId: PredictionModelId) {
  return PREDICTION_MODELS.find((model) => model.id === modelId) ?? PREDICTION_MODELS[0];
}

function buildDistinctConfidences(baseConfidence: number, seed: number, sport: ApiSportId): Record<PredictionModelId, number> {
  const min = sport === "football" ? 44 : 52;
  const max = sport === "football" ? 69 : 82;
  const nexus = clamp(Math.round(baseConfidence), min, max);
  let pulse = clamp(nexus + (seed % 7) - 3, min, max);
  let edge = clamp(nexus + (Math.floor(seed / 3) % 9) - 4, min, max);

  if (pulse === nexus) pulse = clamp(pulse + (pulse < max ? 2 : -2), min, max);
  if (edge === nexus || edge === pulse) edge = clamp(edge + (edge <= max - 3 ? 3 : -3), min, max);
  if (edge === nexus || edge === pulse) edge = clamp(edge + (edge < max ? 1 : -1), min, max);

  return { nexus, pulse, edge };
}

function buildProbabilities(input: {
  confidence: number;
  homeName: string;
  awayName: string;
  model: PredictionModelId;
  pick: string;
  seed: number;
  sport: ApiSportId;
}): PredictionProbability[] {
  const homeIsPick = namesMatch(input.pick, input.homeName);
  const awayIsPick = namesMatch(input.pick, input.awayName);

  if (input.sport !== "football") {
    const selected = clamp(input.confidence, 52, 82);
    return [
      { label: "home", name: input.homeName, value: homeIsPick ? selected : 100 - selected },
      { label: "away", name: input.awayName, value: awayIsPick ? selected : 100 - selected }
    ];
  }

  const modelDrawShift = input.model === "pulse" ? -2 : input.model === "edge" ? 2 : 0;
  const baseDraw = clamp(24 + (input.seed % 4) + modelDrawShift, 20, 30);

  if (!homeIsPick && !awayIsPick) {
    const draw = clamp(32 + modelDrawShift + (input.seed % 3), 29, 38);
    const home = Math.round((100 - draw) / 2 + ((input.seed % 5) - 2));
    return [
      { label: "home", name: input.homeName, value: home },
      { label: "draw", name: "Draw", value: draw },
      { label: "away", name: input.awayName, value: 100 - draw - home }
    ];
  }

  const selected = clamp(input.confidence, 44, 69);
  const other = 100 - baseDraw - selected;
  return [
    { label: "home", name: input.homeName, value: homeIsPick ? selected : other },
    { label: "draw", name: "Draw", value: baseDraw },
    { label: "away", name: input.awayName, value: awayIsPick ? selected : other }
  ];
}

function buildReason(model: PredictionModelId, sport: ApiSportId, locale: Locale, pick: string) {
  const factors = {
    de: {
      nexus: {
        football: "Langfristige Teamstärke, Tabellenprofil, Chancenqualität und historische Vergleichsdaten",
        nfl: "Saison-Effizienz, Quarterback-Stabilität, Turnover-Profil und langfristige Teamstärke",
        nba: "Saison-Effizienz, Net Rating, Rotationstiefe und langfristige Matchup-Daten",
        tennis: "Ranking, langfristige Belagstärke, Serve-/Return-Profil und direkte Vergleiche"
      },
      pulse: {
        football: "Aktuelle Formkurve, jüngste Chancenqualität, Belastung und kurzfristige Verfügbarkeit",
        nfl: "Aktuelle Form, Verletzungsstatus, Erholungstage und jüngster Defensive Pressure",
        nba: "Letzte Spiele, Back-to-back-Belastung, aktuelle Rotation und Pace-Dynamik",
        tennis: "Jüngste Matchform, Turnierbelastung, aktueller Return-Rhythmus und Belagwechsel"
      },
      edge: {
        football: "Direktes Matchup, Heimkontext, Standards und mögliche taktische Vorteile",
        nfl: "Game-Script, Line-Matchups, Heimvorteil und situative Third-Down-Stärke",
        nba: "Lineup-Matchups, Rebounding-Vorteile, Shot Profile und Heimkontext",
        tennis: "Serve-/Return-Matchup, Breakpoint-Druck, Belagprofil und Draw-Kontext"
      }
    },
    en: {
      nexus: {
        football: "Long-term team strength, table profile, chance quality and historical comparison data",
        nfl: "Season efficiency, quarterback stability, turnover profile and long-term team strength",
        nba: "Season efficiency, net rating, rotation depth and long-term matchup data",
        tennis: "Ranking, long-term surface strength, serve-return profile and head-to-head data"
      },
      pulse: {
        football: "Current form, recent chance quality, workload and short-term availability",
        nfl: "Current form, injury status, rest days and recent defensive pressure",
        nba: "Recent games, back-to-back load, current rotation and pace momentum",
        tennis: "Recent match form, tournament workload, return rhythm and surface transitions"
      },
      edge: {
        football: "Direct matchup, home context, set pieces and potential tactical advantages",
        nfl: "Game script, line matchups, home advantage and situational third-down strength",
        nba: "Lineup matchups, rebounding advantages, shot profile and home context",
        tennis: "Serve-return matchup, breakpoint pressure, surface profile and draw context"
      }
    }
  } as const;

  const lead = locale === "de"
    ? `${pick} erhält den Ausschlag.`
    : `${pick} gets the model edge.`;
  const detail = factors[locale][model][sport];
  return `${lead} ${detail}.`;
}

function adjustScore(score: string, sport: ApiSportId, model: PredictionModelId, pick: PredictionProbability["label"], seed: number) {
  if (model === "nexus") return score;
  const match = score.match(/^(\d+)\s*[:\-]\s*(\d+)$/);
  if (!match) return score;

  let home = Number(match[1]);
  let away = Number(match[2]);
  const shouldMove = (seed + (model === "edge" ? 1 : 0)) % 2 === 0;
  if (!shouldMove) return score;

  if (pick === "home") home += 1;
  if (pick === "away") away += 1;
  if (pick === "draw") {
    const level = Math.max(home, away, 1);
    home = level;
    away = level;
  }

  const max = sport === "tennis" ? 3 : Number.MAX_SAFE_INTEGER;
  return `${Math.min(home, max)}:${Math.min(away, max)}`;
}

function namesMatch(left: string, right: string) {
  return normalizeName(left) === normalizeName(right);
}

function isDrawPick(value: string) {
  return ["draw", "remis", "unentschieden", "tightgame", "knappesspiel"].includes(normalizeName(value));
}

function normalizeName(value: string) {
  return value
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/gi, "")
    .toLowerCase();
}

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}
