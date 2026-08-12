import type { DashboardMatch, DashboardPrediction } from "@/lib/dashboard-types";
import { footballCompetitions } from "@/lib/football-data";
import { nbaTeams } from "@/lib/nba-data";
import { nflTeams } from "@/lib/nfl-data";
import type { Locale } from "@/lib/i18n";
import type { PredictionModelId } from "@/lib/prediction-models";
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
  source: "api" | "unavailable";
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
  const liveSportsMatches = await getLiveSportsWidgetMatches(sport, competition, limit).catch(() => []);
  const source = liveSportsMatches.length > 0 ? "api" : "unavailable";
  const baseMatches = liveSportsMatches;
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
      ? getFootballCompetitionApiSnapshot(footballCompetition, { detail: "summary" }).then((snapshot) => ({ snapshot, sport: "football" as const })).catch(() => null)
      : null,
    getSportApiSnapshot("nfl", { detail: "summary" }).then((snapshot) => ({ snapshot, sport: "nfl" as const })).catch(() => null),
    getSportApiSnapshot("nba", { detail: "summary" }).then((snapshot) => ({ snapshot, sport: "nba" as const })).catch(() => null),
    getSportApiSnapshot("tennis", { detail: "summary" }).then((snapshot) => ({ snapshot, sport: "tennis" as const })).catch(() => null)
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
  const predictions = match.predictions
    .filter((prediction) => prediction.isValidForScoring && prediction.provider.toLowerCase() === "openrouter")
    .map((prediction) => toPublicWidgetPrediction(prediction, sport, match.homeTeam, match.awayTeam))
    .sort((left, right) => getModelSortIndex(left.modelKey) - getModelSortIndex(right.modelKey));
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
  competition: string | null,
  limit: number
): Promise<WidgetDashboardMatch[]> {
  const sports: ApiSportId[] = sport === "all" ? ["football", "nfl", "nba", "tennis"] : [sport];
  const snapshots = await Promise.all(sports.map(async (sportId) => {
    if (sportId === "football") {
      const footballCompetition = findFootballCompetitionForWidget(competition);

      if (footballCompetition) {
        const snapshot = await getFootballCompetitionApiSnapshot(footballCompetition);
        return { ...snapshot, matches: snapshot.matches.slice(0, limit) };
      }
    }

    const snapshot = await getSportApiSnapshot(sportId);
    return { ...snapshot, matches: snapshot.matches.slice(0, limit) };
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
    predictions: (match.predictions ?? []).map((prediction) => toDashboardPredictionFromOpenRouter(match, sport, prediction)),
    status: match.status ?? undefined,
    utcDate: match.date ?? undefined,
    venue: match.venue ?? null,
    widgetSport: sport
  };
}

function toDashboardPredictionFromOpenRouter(
  match: SportApiMatch,
  sport: ApiSportId,
  prediction: NonNullable<SportApiMatch["predictions"]>[number]
): DashboardPrediction {
  const probabilities = getStoredPredictionProbabilities(sport, prediction.predictedHome, prediction.predictedAway, prediction.confidence ?? 50);
  return {
    id: prediction.id,
    matchId: match.id,
    model: prediction.modelName,
    provider: prediction.provider,
    predictorId: `openrouter:${prediction.modelVersion ?? "model"}:${prediction.modelKey}`,
    accessCondition: "closed_book",
    promptStrategy: "direct_score",
    forecastHorizon: "T_24H",
    stage: "unknown",
    matchDate: match.date,
    sampleId: 1,
    predictedHome: prediction.predictedHome,
    predictedAway: prediction.predictedAway,
    predictedFullHome: null,
    predictedFullAway: null,
    homeWin90Prob: probabilities.home,
    draw90Prob: probabilities.draw,
    awayWin90Prob: probabilities.away,
    homeWinFullProb: null,
    drawFullProb: null,
    awayWinFullProb: null,
    homeAdvancesProb: null,
    awayAdvancesProb: null,
    confidence: prediction.confidence,
    reason: prediction.reason,
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

function getStoredPredictionProbabilities(
  sport: ApiSportId,
  predictedHome: number,
  predictedAway: number,
  confidence: number
): PublicWidgetProbabilities {
  const selected = Math.max(34, Math.min(sport === "football" ? 75 : 90, Math.round(confidence)));
  if (sport !== "football") {
    return predictedHome >= predictedAway
      ? { home: selected, draw: null, away: 100 - selected }
      : { home: 100 - selected, draw: null, away: selected };
  }
  if (predictedHome === predictedAway) {
    const home = Math.round((100 - selected) / 2);
    return { home, draw: selected, away: 100 - selected - home };
  }
  const draw = Math.max(12, Math.min(28, Math.round((100 - selected) * 0.4)));
  const other = 100 - selected - draw;
  return predictedHome > predictedAway
    ? { home: selected, draw, away: other }
    : { home: other, draw, away: selected };
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
    modelKey: getPredictionModelKey(prediction),
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

function getPredictionModelKey(prediction: DashboardPrediction): PredictionModelId {
  const value = `${prediction.predictorId}:${prediction.model}`.toLowerCase();
  if (value.includes("pulse")) return "pulse";
  if (value.includes("edge")) return "edge";
  return "nexus";
}

function getModelSortIndex(model: PredictionModelId) {
  return model === "nexus" ? 0 : model === "pulse" ? 1 : 2;
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
  if (sport === "tennis") {
    return getOfficialWidgetLogo(resolveTennisPlayerFlagUrl(name, currentLogo));
  }

  return getOfficialWidgetLogo(currentLogo)
    ?? null;
}

function compareWidgetMatches(left: PublicWidgetMatch, right: PublicWidgetMatch): number {
  const leftTime = left.date ? Date.parse(left.date) : Number.POSITIVE_INFINITY;
  const rightTime = right.date ? Date.parse(right.date) : Number.POSITIVE_INFINITY;

  return leftTime - rightTime || left.homeTeam.localeCompare(right.homeTeam);
}

function normalizeKey(value: unknown): string {
  return String(value ?? "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}
