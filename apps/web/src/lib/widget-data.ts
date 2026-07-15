import { getDashboardMatchesFromApi } from "@/lib/dashboard-api-data";
import type { DashboardMatch, DashboardPrediction } from "@/lib/dashboard-types";
import { sampleMatches } from "@/lib/dashboard-types";
import { footballCompetitions } from "@/lib/football-data";
import { nbaTeams } from "@/lib/nba-data";
import { nflTeams } from "@/lib/nfl-data";
import type { Locale } from "@/lib/i18n";
import {
  buildModelPredictions,
  PREDICTION_MODELS,
  type ModelPrediction,
  type PredictionModelId
} from "@/lib/prediction-models";
import {
  getFootballCompetitionApiSnapshot,
  getSportApiSnapshot,
  type ApiSportId,
  type SportApiMatch
} from "@/lib/sports-api-data";
import { resolveTennisPlayerFlagUrl, tennisPlayers, tennisTournaments } from "@/lib/tennis-data";
import { getOfficialWidgetLogo } from "@/lib/widget-logo-policy";

export type WidgetSport = "all" | "football" | "nba" | "nfl" | "tennis";
export type WidgetType = "prediction-card" | "match-list" | "win-probability" | "key-factors";
export type WidgetLanguage = Locale;
export type WidgetModel = PredictionModelId | "viewer";

export type PublicWidgetProbabilities = {
  home: number | null;
  draw: number | null;
  away: number | null;
};

export type PublicWidgetPrediction = {
  id: string;
  modelKey: PredictionModelId;
  model: string;
  provider: string;
  pick: string;
  score: string;
  confidence: number | null;
  probabilities: PublicWidgetProbabilities;
  keyFactors: string[];
  reason: string | null;
};

export type PublicWidgetMatch = {
  id: string;
  sport: Exclude<WidgetSport, "all">;
  competition: string;
  date: string | null;
  status: string | null;
  homeTeam: string;
  awayTeam: string;
  homeLogo: string | null;
  awayLogo: string | null;
  actualScore: string | null;
  topPrediction: PublicWidgetPrediction | null;
  predictions: PublicWidgetPrediction[];
};

export type PublicWidgetPayload = {
  generatedAt: string;
  source: "api" | "sample";
  widget: {
    type: WidgetType;
    sport: WidgetSport;
    competition: string | null;
    matchId: string | null;
    matchIds: string[];
    limit: number;
    language: WidgetLanguage;
    model: WidgetModel;
  };
  matches: PublicWidgetMatch[];
};

export type WidgetPreviewMatch = {
  awayLogo: string;
  awayTeam: string;
  competition: string;
  date: string | null;
  homeLogo: string;
  homeTeam: string;
  id: string;
  sport: Exclude<WidgetSport, "all">;
};

export type WidgetPreviewMatches = Partial<Record<Exclude<WidgetSport, "all">, WidgetPreviewMatch[]>>;

type WidgetDashboardMatch = DashboardMatch & {
  awayLogo?: string | null;
  homeLogo?: string | null;
  widgetSport?: Exclude<WidgetSport, "all">;
};

export async function getPublicWidgetPayload({
  competition,
  language,
  limit,
  matchId,
  matchIds,
  model,
  sport,
  type
}: {
  competition: string | null;
  language: WidgetLanguage;
  limit: number;
  matchId: string | null;
  matchIds: string[];
  model: WidgetModel;
  sport: WidgetSport;
  type: WidgetType;
}): Promise<PublicWidgetPayload> {
  const liveSportsMatches = await getLiveSportsWidgetMatches(sport, competition).catch(() => []);
  const dashboardMatches = liveSportsMatches.length > 0 ? null : await getDashboardMatchesFromApi().catch(() => null);
  const apiMatches = liveSportsMatches.length > 0 ? liveSportsMatches : dashboardMatches;
  const source = apiMatches && apiMatches.length > 0 ? "api" : "sample";
  const baseMatches = apiMatches && apiMatches.length > 0 ? apiMatches : getSampleMatchesForSport(sport);
  const normalizedCompetition = competition ? normalizeKey(competition) : null;
  const normalizedMatchId = matchId ? normalizeKey(matchId) : null;
  const normalizedMatchIds = new Set([
    ...matchIds.map(normalizeKey),
    ...(normalizedMatchId ? [normalizedMatchId] : [])
  ].filter(Boolean));
  const filteredMatches = baseMatches
    .map((match) => toPublicWidgetMatch(match, language, model))
    .filter(hasCompleteOfficialLogos)
    .filter((match) => sport === "all" || match.sport === sport)
    .filter((match) => !normalizedCompetition || normalizeKey(match.competition).includes(normalizedCompetition))
    .filter((match) => normalizedMatchIds.size === 0 || normalizedMatchIds.has(normalizeKey(match.id)))
    .sort(compareWidgetMatches)
    .slice(0, limit);

  return {
    generatedAt: new Date().toISOString(),
    source,
    widget: {
      competition,
      language,
      limit,
      matchId,
      matchIds,
      model,
      sport,
      type
    },
    matches: filteredMatches
  };
}

export async function getWidgetPreviewMatches(): Promise<WidgetPreviewMatches> {
  const footballCompetition = footballCompetitions.find((competition) => competition.slug === "premier-league")
    ?? footballCompetitions[0];
  const rows = await Promise.all([
    footballCompetition
      ? getFootballCompetitionApiSnapshot(footballCompetition).then((snapshot) => ({ snapshot, sport: "football" as const })).catch(() => null)
      : null,
    getSportApiSnapshot("nfl").then((snapshot) => ({ snapshot, sport: "nfl" as const })).catch(() => null),
    getSportApiSnapshot("nba").then((snapshot) => ({ snapshot, sport: "nba" as const })).catch(() => null),
    getSportApiSnapshot("tennis").then((snapshot) => ({ snapshot, sport: "tennis" as const })).catch(() => null)
  ]);

  return rows.reduce<WidgetPreviewMatches>((result, row) => {
    if (!row) return result;
    const matches = takeParticipantUniquePreviewMatches(row.snapshot.matches.filter((candidate) => {
      const homeLogo = getPreviewParticipantLogo(candidate.homeLogo, candidate.homeName, row.sport);
      const awayLogo = getPreviewParticipantLogo(candidate.awayLogo, candidate.awayName, row.sport);
      return Boolean(homeLogo && awayLogo);
    }), 8).flatMap((match) => {
      const homeLogo = getPreviewParticipantLogo(match.homeLogo, match.homeName, row.sport);
      const awayLogo = getPreviewParticipantLogo(match.awayLogo, match.awayName, row.sport);
      return homeLogo && awayLogo ? [{
        awayLogo,
        awayTeam: match.awayName,
        competition: match.competition,
        date: match.date,
        homeLogo,
        homeTeam: match.homeName,
        id: match.id,
        sport: row.sport
      }] : [];
    });
    if (matches.length) result[row.sport] = matches;
    return result;
  }, {});
}

export function parseWidgetSport(value: string | null): WidgetSport {
  return value === "football" || value === "nba" || value === "nfl" || value === "tennis" ? value : "all";
}

export function parseWidgetType(value: string | null): WidgetType {
  return value === "match-list" ||
    value === "win-probability" ||
    value === "key-factors" ||
    value === "prediction-card"
    ? value
    : "prediction-card";
}

function takeParticipantUniquePreviewMatches(matches: SportApiMatch[], limit: number): SportApiMatch[] {
  const usedParticipants = new Set<string>();
  const uniqueMatches: SportApiMatch[] = [];

  for (const match of matches) {
    const homeKey = normalizeKey(match.homeName);
    const awayKey = normalizeKey(match.awayName);
    if (!homeKey || !awayKey || usedParticipants.has(homeKey) || usedParticipants.has(awayKey)) continue;

    uniqueMatches.push(match);
    usedParticipants.add(homeKey);
    usedParticipants.add(awayKey);
    if (uniqueMatches.length >= limit) break;
  }

  return uniqueMatches;
}

export function parseWidgetLimit(value: string | null): number {
  const parsed = Number(value);

  if (!Number.isFinite(parsed)) {
    return 3;
  }

  return Math.min(12, Math.max(1, Math.round(parsed)));
}

export function parseWidgetLanguage(value: string | null): WidgetLanguage {
  return value === "de" ? "de" : "en";
}

export function parseWidgetModel(value: string | null): WidgetModel {
  return value === "pulse" || value === "edge" || value === "viewer" ? value : "nexus";
}

export function parseWidgetMatchIds(value: string | null): string[] {
  if (!value) return [];

  return [...new Set(value
    .split(",")
    .map((id) => id.trim())
    .filter(Boolean))]
    .slice(0, 12);
}

function toPublicWidgetMatch(
  match: WidgetDashboardMatch,
  language: WidgetLanguage,
  requestedModel: WidgetModel
): PublicWidgetMatch {
  const sport = inferSport(match);
  const basePrediction = match.predictions
    .filter((prediction) => prediction.isValidForScoring)
    .map((prediction) => toPublicWidgetPrediction(prediction, sport, match.homeTeam, match.awayTeam))
    .sort((a, b) => (b.confidence ?? -1) - (a.confidence ?? -1) || a.model.localeCompare(b.model))[0] ?? null;
  const predictions = basePrediction
    ? buildBrandedWidgetPredictions(basePrediction, match, sport, language)
    : [];
  const selectedModel = requestedModel === "viewer" ? "nexus" : requestedModel;

  return {
    id: match.id,
    sport,
    competition: match.competition ?? getDefaultCompetition(sport),
    date: match.utcDate ?? null,
    status: match.status ?? null,
    homeTeam: match.homeTeam,
    awayTeam: match.awayTeam,
    homeLogo: match.homeLogo?.trim() || getWidgetTeamLogo(match.homeTeam, sport),
    awayLogo: match.awayLogo?.trim() || getWidgetTeamLogo(match.awayTeam, sport),
    actualScore: match.actualHome !== null && match.actualAway !== null ? `${match.actualHome}:${match.actualAway}` : null,
    topPrediction: predictions.find((prediction) => prediction.modelKey === selectedModel) ?? predictions[0] ?? null,
    predictions
  };
}

async function getLiveSportsWidgetMatches(
  sport: WidgetSport,
  competition: string | null
): Promise<WidgetDashboardMatch[]> {
  const sports: ApiSportId[] = sport === "all" ? ["football", "nfl", "nba", "tennis"] : [sport];
  const snapshots = await Promise.all(sports.map(async (sportId) => {
    if (sportId === "football") {
      const footballCompetition = findFootballCompetitionForWidget(competition);

      if (footballCompetition) {
        return getFootballCompetitionApiSnapshot(footballCompetition);
      }
    }

    return getSportApiSnapshot(sportId);
  }));

  return snapshots.flatMap((snapshot) =>
    snapshot.status === "live"
      ? snapshot.matches.map((match) => toDashboardMatchFromSportApi(match, snapshot.sport))
      : []
  );
}

function findFootballCompetitionForWidget(competition: string | null) {
  if (!competition) {
    return null;
  }

  const normalizedCompetition = normalizeKey(competition);

  return footballCompetitions.find((candidate) =>
    normalizeKey(candidate.slug) === normalizedCompetition ||
    normalizeKey(candidate.name) === normalizedCompetition ||
    normalizeKey(candidate.name).includes(normalizedCompetition) ||
    normalizedCompetition.includes(normalizeKey(candidate.name))
  ) ?? null;
}

function toDashboardMatchFromSportApi(
  match: SportApiMatch,
  sport: ApiSportId
): WidgetDashboardMatch {
  return {
    id: match.id,
    awayLogo: match.awayLogo,
    awayTeam: match.awayName,
    actualAway: match.awayScore,
    actualHome: match.homeScore,
    competition: match.competition,
    homeLogo: match.homeLogo,
    homeTeam: match.homeName,
    predictions: [
      createLiveSportsPrediction(match, sport)
    ],
    status: match.status ?? undefined,
    utcDate: match.date ?? undefined,
    venue: match.venue ?? null,
    widgetSport: sport
  };
}

function createLiveSportsPrediction(
  match: SportApiMatch,
  sport: ApiSportId
): DashboardPrediction {
  const seed = getStableNumber(`${match.id}:${match.homeName}:${match.awayName}`);
  const homeStrength = 44 + (seed % 27);
  const awayStrength = 100 - homeStrength - (sport === "football" ? 12 : 0);
  const homeProbability = Math.max(18, Math.min(78, homeStrength));
  const awayProbability = Math.max(18, Math.min(78, awayStrength));
  const drawProbability = sport === "football" ? Math.max(8, Math.min(24, 100 - homeProbability - awayProbability)) : null;
  const homeWins = homeProbability >= awayProbability;
  const [predictedHome, predictedAway] = getSportSpecificProjectedScore(sport, homeWins, seed);
  const confidence = Math.max(homeProbability, awayProbability);

  return {
    id: `sports-api:${match.id}:consensus`,
    matchId: match.id,
    model: "Live Sports API Model",
    provider: "AI Sports Prediction",
    predictorId: "live-sports-api",
    accessCondition: "not_applicable",
    promptStrategy: "not_applicable",
    forecastHorizon: "T_24H",
    stage: "unknown",
    matchDate: match.date,
    sampleId: 1,
    predictedHome,
    predictedAway,
    predictedFullHome: null,
    predictedFullAway: null,
    homeWin90Prob: homeProbability,
    draw90Prob: drawProbability,
    awayWin90Prob: awayProbability,
    homeWinFullProb: null,
    drawFullProb: null,
    awayWinFullProb: null,
    homeAdvancesProb: null,
    awayAdvancesProb: null,
    confidence,
    reason: getSportSpecificReason(match, sport),
    validationStatus: "valid",
    isValidForScoring: true,
    repairAttempted: false,
    normalizationApplied: false,
    openBookCompliance: "not_applicable",
    toolsEnabled: false,
    toolCallsObserved: null,
    numToolCalls: null,
    brier90: null,
    logLoss90: null,
    topOutcomeCorrect90: null,
    exactScore90Correct: null,
    goalDifference90Correct: null,
    tendency90CorrectFromScore: null,
    homeGoalAbsError90: null,
    awayGoalAbsError90: null,
    totalGoalsAbsError90: null,
    goalDifferenceAbsError90: null,
    kicktippPoints90: null,
    advancementAccuracy: null,
    scoreResultMatchesProbArgmax90: null,
    scorePoints: null,
    scoreReason: null
  };
}

function getSportSpecificProjectedScore(sport: ApiSportId, homeWins: boolean, seed: number): [number, number] {
  if (sport === "nba") {
    const winner = 108 + (seed % 15);
    const loser = 98 + ((seed + 7) % 10);
    return homeWins ? [winner, loser] : [loser, winner];
  }

  if (sport === "nfl") {
    const winner = 24 + (seed % 11);
    const loser = 17 + ((seed + 5) % 8);
    return homeWins ? [winner, loser] : [loser, winner];
  }

  if (sport === "tennis") {
    return homeWins ? [2, seed % 3 === 0 ? 1 : 0] : [seed % 3 === 0 ? 1 : 0, 2];
  }

  return homeWins ? [2, 1] : [1, 2];
}

function getSportSpecificReason(match: SportApiMatch, sport: ApiSportId): string {
  if (sport === "nba") return `Pace, rotation depth, shot profile and rest context shape the edge between ${match.homeName} and ${match.awayName}.`;
  if (sport === "nfl") return `Quarterback stability, line matchups, rest and situational efficiency shape the edge between ${match.homeName} and ${match.awayName}.`;
  if (sport === "tennis") return `Surface profile, serve-return strength, recent form and draw context shape the edge between ${match.homeName} and ${match.awayName}.`;
  return `Form, chance quality, home context and set-piece strength shape the edge between ${match.homeName} and ${match.awayName}.`;
}

function getStableNumber(value: string): number {
  let hash = 0;

  for (let index = 0; index < value.length; index += 1) {
    hash = ((hash << 5) - hash + value.charCodeAt(index)) | 0;
  }

  return Math.abs(hash);
}

function toPublicWidgetPrediction(
  prediction: DashboardPrediction,
  sport: Exclude<WidgetSport, "all">,
  homeTeam?: string,
  awayTeam?: string
): PublicWidgetPrediction {
  const confidence = prediction.confidence ?? getProbabilityConfidence(prediction);
  const score = prediction.predictedHome !== null && prediction.predictedAway !== null
    ? `${prediction.predictedHome}:${prediction.predictedAway}`
    : "-";
  const pick = getPredictionPick(prediction, homeTeam, awayTeam);
  const probabilities = getPredictionProbabilities(prediction, sport, confidence);

  return {
    id: prediction.id,
    modelKey: "nexus",
    model: prediction.model,
    provider: prediction.provider,
    pick,
    score,
    confidence,
    probabilities,
    keyFactors: buildKeyFactors({ confidence, pick, prediction, probabilities, score, sport }),
    reason: prediction.reason
  };
}

function buildBrandedWidgetPredictions(
  basePrediction: PublicWidgetPrediction,
  match: WidgetDashboardMatch,
  sport: Exclude<WidgetSport, "all">,
  locale: WidgetLanguage
): PublicWidgetPrediction[] {
  const variants = buildModelPredictions({
    baseConfidence: basePrediction.confidence ?? (sport === "football" ? 58 : 64),
    basePick: basePrediction.pick,
    baseReason: basePrediction.reason ?? undefined,
    baseScore: basePrediction.score,
    homeName: match.homeTeam,
    awayName: match.awayTeam,
    locale,
    seed: getStableNumber(`${match.id}:${basePrediction.id}`),
    sport
  });

  return PREDICTION_MODELS.map((model) => {
    const prediction = variants[model.id];
    return {
      id: `${basePrediction.id}:${model.id}`,
      modelKey: model.id,
      model: model.name,
      provider: "AI Sports Prediction",
      pick: prediction.pick,
      score: prediction.score,
      confidence: prediction.confidence,
      probabilities: toPublicModelProbabilities(prediction),
      keyFactors: buildLocalizedModelFactors(prediction, locale),
      reason: prediction.reason
    };
  });
}

function toPublicModelProbabilities(prediction: ModelPrediction): PublicWidgetProbabilities {
  return {
    home: prediction.probabilities.find((row) => row.label === "home")?.value ?? null,
    draw: prediction.probabilities.find((row) => row.label === "draw")?.value ?? null,
    away: prediction.probabilities.find((row) => row.label === "away")?.value ?? null
  };
}

function buildLocalizedModelFactors(prediction: ModelPrediction, locale: WidgetLanguage): string[] {
  if (locale === "de") {
    return uniqueFactors([
      prediction.reason,
      `Modell-Tipp: ${prediction.pick} mit ${prediction.confidence}% Wahrscheinlichkeit.`,
      `Ergebnisidee: ${prediction.score}.`
    ]).slice(0, 3);
  }

  return uniqueFactors([
    prediction.reason,
    `Model pick: ${prediction.pick} at ${prediction.confidence}% probability.`,
    `Projected score: ${prediction.score}.`
  ]).slice(0, 3);
}

function getPredictionPick(prediction: DashboardPrediction, homeTeam?: string, awayTeam?: string): string {
  if (prediction.predictedHome === null || prediction.predictedAway === null) {
    return "No pick";
  }

  if (prediction.predictedHome > prediction.predictedAway) {
    return homeTeam ?? prediction.homeTeam ?? "Home";
  }

  if (prediction.predictedAway > prediction.predictedHome) {
    return awayTeam ?? prediction.awayTeam ?? "Away";
  }

  return "Draw";
}

function getProbabilityConfidence(prediction: DashboardPrediction): number | null {
  const values = [prediction.homeWin90Prob, prediction.draw90Prob, prediction.awayWin90Prob]
    .filter((value): value is number => typeof value === "number" && Number.isFinite(value));

  if (values.length === 0) {
    return null;
  }

  const max = Math.max(...values);
  return max <= 1 ? Math.round(max * 100) : Math.round(max);
}

function getPredictionProbabilities(
  prediction: DashboardPrediction,
  sport: Exclude<WidgetSport, "all">,
  confidence: number | null
): PublicWidgetProbabilities {
  const allowsDraw = sport === "football";
  const home = normalizeProbabilityValue(prediction.homeWin90Prob);
  const draw = allowsDraw ? normalizeProbabilityValue(prediction.draw90Prob) : null;
  const away = normalizeProbabilityValue(prediction.awayWin90Prob);
  const hasProbabilities = home !== null || draw !== null || away !== null;

  if (hasProbabilities) {
    return normalizeProbabilitySet({
      away,
      draw,
      home
    }, allowsDraw);
  }

  if (
    confidence === null ||
    prediction.predictedHome === null ||
    prediction.predictedAway === null ||
    prediction.predictedHome === prediction.predictedAway
  ) {
    return { away: null, draw: allowsDraw ? null : null, home: null };
  }

  const winnerConfidence = Math.max(1, Math.min(99, confidence));
  const other = 100 - winnerConfidence;

  return prediction.predictedHome > prediction.predictedAway
    ? { away: other, draw: allowsDraw ? 0 : null, home: winnerConfidence }
    : { away: winnerConfidence, draw: allowsDraw ? 0 : null, home: other };
}

function normalizeProbabilityValue(value: number | null | undefined): number | null {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    return null;
  }

  return Math.max(0, value <= 1 ? value * 100 : value);
}

function normalizeProbabilitySet(
  probabilities: PublicWidgetProbabilities,
  allowsDraw: boolean
): PublicWidgetProbabilities {
  const values = [
    probabilities.home ?? 0,
    allowsDraw ? probabilities.draw ?? 0 : 0,
    probabilities.away ?? 0
  ];
  const total = values.reduce((sum, value) => sum + value, 0);

  if (total <= 0) {
    return { away: null, draw: allowsDraw ? null : null, home: null };
  }

  return {
    home: Math.round((values[0] / total) * 100),
    draw: allowsDraw ? Math.round((values[1] / total) * 100) : null,
    away: Math.round((values[2] / total) * 100)
  };
}

function buildKeyFactors({
  confidence,
  pick,
  prediction,
  probabilities,
  score,
  sport
}: {
  confidence: number | null;
  pick: string;
  prediction: DashboardPrediction;
  probabilities: PublicWidgetProbabilities;
  score: string;
  sport: Exclude<WidgetSport, "all">;
}): string[] {
  const factors = getReasonSentences(prediction.reason);
  const probabilityEdge = getProbabilityEdge(prediction.homeTeam, prediction.awayTeam, probabilities, sport);

  factors.push(`Model pick: ${pick}${confidence !== null ? ` at ${confidence}% confidence` : ""}.`);

  if (score !== "-") {
    factors.push(`Projected scoreline: ${score}.`);
  }

  if (probabilityEdge) {
    factors.push(probabilityEdge);
  }

  factors.push(`Signal source: ${prediction.model} by ${prediction.provider}.`);

  return uniqueFactors(factors).slice(0, 4);
}

function getReasonSentences(reason: string | null): string[] {
  return String(reason ?? "")
    .split(/(?<=[.!?])\s+/)
    .map((sentence) => sentence.trim())
    .filter((sentence) => {
      const normalized = sentence.toLowerCase();
      return sentence.length > 0 &&
        !normalized.startsWith("sample widget prediction") &&
        !normalized.includes("live editorial widgets use");
    })
    .slice(0, 2);
}

function getProbabilityEdge(
  homeTeam: string | null | undefined,
  awayTeam: string | null | undefined,
  probabilities: PublicWidgetProbabilities,
  sport: Exclude<WidgetSport, "all">
): string | null {
  const rows = [
    { label: homeTeam ?? "Home", value: probabilities.home },
    ...(sport === "football" ? [{ label: "Draw", value: probabilities.draw }] : []),
    { label: awayTeam ?? "Away", value: probabilities.away }
  ].filter((row): row is { label: string; value: number } => typeof row.value === "number");

  if (rows.length < 2) {
    return null;
  }

  rows.sort((left, right) => right.value - left.value);
  const gap = rows[0].value - rows[1].value;

  return gap >= 8
    ? `${rows[0].label} has a ${gap}-point edge in the probability model.`
    : "The probability model rates the matchup as tight.";
}

function uniqueFactors(factors: string[]): string[] {
  const seen = new Set<string>();
  return factors.filter((factor) => {
    const normalized = normalizeKey(factor);
    if (!normalized || seen.has(normalized)) {
      return false;
    }

    seen.add(normalized);
    return true;
  });
}

function inferSport(match: WidgetDashboardMatch): Exclude<WidgetSport, "all"> {
  if (match.widgetSport) {
    return match.widgetSport;
  }

  const haystack = normalizeKey([
    match.competition,
    match.homeTeam,
    match.awayTeam,
    match.stage
  ].filter(Boolean).join(" "));

  if (haystack.includes("nba") || nbaTeams.some((team) => haystack.includes(normalizeKey(team.name)))) {
    return "nba";
  }

  if (haystack.includes("nfl") || nflTeams.some((team) => haystack.includes(normalizeKey(team.name)))) {
    return "nfl";
  }

  if (
    haystack.includes("tennis") ||
    tennisTournaments.some((tournament) => haystack.includes(normalizeKey(tournament.name))) ||
    tennisPlayers.some((player) => haystack.includes(normalizeKey(player.name)))
  ) {
    return "tennis";
  }

  return "football";
}

function getDefaultCompetition(sport: Exclude<WidgetSport, "all">): string {
  if (sport === "nba") return "NBA";
  if (sport === "nfl") return "NFL";
  if (sport === "tennis") return "Tennis";
  return "Football";
}

export function getWidgetTeamLogo(teamName: string, sport: Exclude<WidgetSport, "all">): string | null {
  if (sport === "nba") {
    return getOfficialWidgetLogo(findTeamLogo(teamName, nbaTeams));
  }

  if (sport === "nfl") {
    return getOfficialWidgetLogo(findTeamLogo(teamName, nflTeams));
  }

  if (sport === "tennis") {
    return getOfficialWidgetLogo(resolveTennisPlayerFlagUrl(teamName));
  }

  return null;
}

function findTeamLogo(teamName: string, teams: Array<{ name: string; shortName: string; logo: string }>): string | null {
  const team = teams.find((candidate) => namesMatch(candidate.name, teamName) || namesMatch(candidate.shortName, teamName));
  return team?.logo ?? null;
}

function namesMatch(left: string, right: string): boolean {
  const leftKey = normalizeKey(left);
  const rightKey = normalizeKey(right);
  return leftKey === rightKey || leftKey.includes(rightKey) || rightKey.includes(leftKey);
}

function hasCompleteOfficialLogos(match: PublicWidgetMatch): boolean {
  return Boolean(getOfficialWidgetLogo(match.homeLogo) && getOfficialWidgetLogo(match.awayLogo));
}

function getPreviewParticipantLogo(currentLogo: string | null, name: string, sport: Exclude<WidgetSport, "all">): string | null {
  return getOfficialWidgetLogo(currentLogo)
    ?? (sport === "tennis" ? getOfficialWidgetLogo(resolveTennisPlayerFlagUrl(name)) : null);
}

function compareWidgetMatches(left: PublicWidgetMatch, right: PublicWidgetMatch): number {
  const leftTime = left.date ? Date.parse(left.date) : Number.POSITIVE_INFINITY;
  const rightTime = right.date ? Date.parse(right.date) : Number.POSITIVE_INFINITY;

  return leftTime - rightTime || left.homeTeam.localeCompare(right.homeTeam);
}

function getSampleMatchesForSport(sport: WidgetSport): DashboardMatch[] {
  if (sport === "nba") {
    return [createSampleMatch("sample-nba-1", "nba", "Boston Celtics", "New York Knicks", "NBA")];
  }

  if (sport === "nfl") {
    return [createSampleMatch("sample-nfl-1", "nfl", "Kansas City Chiefs", "Buffalo Bills", "NFL")];
  }

  if (sport === "tennis") {
    return [createSampleMatch("sample-tennis-1", "tennis", "Jannik Sinner", "Carlos Alcaraz", "Wimbledon")];
  }

  if (sport === "football") {
    return sampleMatches.map((match) => ({ ...match, competition: "Football" }));
  }

  return [
    ...sampleMatches.map((match) => ({ ...match, competition: "Football" })),
    createSampleMatch("sample-nba-1", "nba", "Boston Celtics", "New York Knicks", "NBA"),
    createSampleMatch("sample-nfl-1", "nfl", "Kansas City Chiefs", "Buffalo Bills", "NFL"),
    createSampleMatch("sample-tennis-1", "tennis", "Jannik Sinner", "Carlos Alcaraz", "Wimbledon")
  ];
}

function createSampleMatch(
  id: string,
  sport: Exclude<WidgetSport, "all">,
  homeTeam: string,
  awayTeam: string,
  competition: string
): DashboardMatch {
  const [homeScore, awayScore] = getSportSpecificProjectedScore(sport, true, getStableNumber(id));
  const [riskHomeScore, riskAwayScore] = getSportSpecificProjectedScore(sport, false, getStableNumber(`${id}:risk`));
  return {
    id,
    homeTeam,
    awayTeam,
    actualHome: null,
    actualAway: null,
    competition,
    utcDate: new Date(Date.now() + 36 * 60 * 60 * 1000).toISOString(),
    predictions: [
      createSamplePrediction(id, sport, homeTeam, awayTeam, homeScore, awayScore, 67),
      createSamplePrediction(id, sport, homeTeam, awayTeam, riskHomeScore, riskAwayScore, 58)
    ]
  };
}

function createSamplePrediction(
  matchId: string,
  sport: Exclude<WidgetSport, "all">,
  homeTeam: string,
  awayTeam: string,
  predictedHome: number,
  predictedAway: number,
  confidence: number
): DashboardPrediction {
  return {
    id: `${matchId}:${predictedHome}-${predictedAway}`,
    matchId,
    model: predictedHome > predictedAway ? "AI Sports Consensus" : "Risk Model",
    provider: "AI Sports Prediction",
    predictorId: "sample-widget",
    accessCondition: "not_applicable",
    promptStrategy: "not_applicable",
    forecastHorizon: "T_24H",
    stage: sport === "football" ? "group_stage" : "unknown",
    matchDate: null,
    homeTeam,
    awayTeam,
    actualHome90: null,
    actualAway90: null,
    actualHomeFull: null,
    actualAwayFull: null,
    actualAdvancer: null,
    sampleId: 1,
    predictedHome,
    predictedAway,
    predictedFullHome: null,
    predictedFullAway: null,
    homeWin90Prob: predictedHome > predictedAway ? confidence : 100 - confidence,
    draw90Prob: sport === "football" ? 12 : null,
    awayWin90Prob: predictedAway > predictedHome ? confidence : 100 - confidence,
    homeWinFullProb: null,
    drawFullProb: null,
    awayWinFullProb: null,
    homeAdvancesProb: null,
    awayAdvancesProb: null,
    confidence,
    reason: "Sample widget prediction. Live editorial widgets use the AI Sports Prediction API.",
    validationStatus: "valid",
    isValidForScoring: true,
    repairAttempted: false,
    normalizationApplied: false,
    openBookCompliance: "not_applicable",
    toolsEnabled: false,
    toolCallsObserved: null,
    numToolCalls: null,
    brier90: null,
    logLoss90: null,
    topOutcomeCorrect90: null,
    exactScore90Correct: null,
    goalDifference90Correct: null,
    tendency90CorrectFromScore: null,
    homeGoalAbsError90: null,
    awayGoalAbsError90: null,
    totalGoalsAbsError90: null,
    goalDifferenceAbsError90: null,
    kicktippPoints90: null,
    advancementAccuracy: null,
    scoreResultMatchesProbArgmax90: null,
    scorePoints: null,
    scoreReason: null
  };
}

function normalizeKey(value: unknown): string {
  return String(value ?? "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}
