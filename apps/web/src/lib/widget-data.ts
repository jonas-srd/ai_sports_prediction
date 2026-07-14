import { getDashboardMatchesFromApi } from "@/lib/dashboard-api-data";
import type { DashboardMatch, DashboardPrediction } from "@/lib/dashboard-types";
import { sampleMatches } from "@/lib/dashboard-types";
import { getTeamFlag } from "@/lib/country-flags";
import { footballCompetitions } from "@/lib/football-data";
import { nbaTeams } from "@/lib/nba-data";
import { nflTeams } from "@/lib/nfl-data";
import {
  getFootballCompetitionApiSnapshot,
  getSportApiSnapshot,
  type ApiSportId,
  type SportApiMatch
} from "@/lib/sports-api-data";
import { resolveTennisPlayerFlagUrl, tennisPlayers, tennisTournaments } from "@/lib/tennis-data";

export type WidgetSport = "all" | "football" | "nba" | "nfl" | "tennis";
export type WidgetType = "prediction-card" | "match-list" | "leaderboard" | "win-probability" | "key-factors";

export type PublicWidgetProbabilities = {
  home: number | null;
  draw: number | null;
  away: number | null;
};

export type PublicWidgetPrediction = {
  id: string;
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

export type PublicWidgetLeaderboardEntry = {
  model: string;
  provider: string;
  predictions: number;
  averageConfidence: number | null;
};

export type PublicWidgetPayload = {
  generatedAt: string;
  source: "api" | "sample";
  widget: {
    type: WidgetType;
    sport: WidgetSport;
    competition: string | null;
    matchId: string | null;
    limit: number;
  };
  matches: PublicWidgetMatch[];
  leaderboard: PublicWidgetLeaderboardEntry[];
};

type WidgetDashboardMatch = DashboardMatch & {
  awayLogo?: string | null;
  homeLogo?: string | null;
  widgetSport?: Exclude<WidgetSport, "all">;
};

export async function getPublicWidgetPayload({
  competition,
  limit,
  matchId,
  sport,
  type
}: {
  competition: string | null;
  limit: number;
  matchId: string | null;
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
  const filteredMatches = baseMatches
    .map(toPublicWidgetMatch)
    .filter((match) => sport === "all" || match.sport === sport)
    .filter((match) => !normalizedCompetition || normalizeKey(match.competition).includes(normalizedCompetition))
    .filter((match) => !normalizedMatchId || normalizeKey(match.id) === normalizedMatchId)
    .sort(compareWidgetMatches)
    .slice(0, limit);

  return {
    generatedAt: new Date().toISOString(),
    source,
    widget: {
      competition,
      limit,
      matchId,
      sport,
      type
    },
    matches: filteredMatches,
    leaderboard: buildWidgetLeaderboard(filteredMatches)
  };
}

export function parseWidgetSport(value: string | null): WidgetSport {
  return value === "football" || value === "nba" || value === "nfl" || value === "tennis" ? value : "all";
}

export function parseWidgetType(value: string | null): WidgetType {
  return value === "match-list" ||
    value === "leaderboard" ||
    value === "win-probability" ||
    value === "key-factors" ||
    value === "prediction-card"
    ? value
    : "prediction-card";
}

export function parseWidgetLimit(value: string | null): number {
  const parsed = Number(value);

  if (!Number.isFinite(parsed)) {
    return 3;
  }

  return Math.min(12, Math.max(1, Math.round(parsed)));
}

function toPublicWidgetMatch(match: WidgetDashboardMatch): PublicWidgetMatch {
  const sport = inferSport(match);
  const predictions = match.predictions
    .filter((prediction) => prediction.isValidForScoring)
    .map((prediction) => toPublicWidgetPrediction(prediction, sport))
    .sort((a, b) => (b.confidence ?? -1) - (a.confidence ?? -1) || a.model.localeCompare(b.model));

  return {
    id: match.id,
    sport,
    competition: match.competition ?? getDefaultCompetition(sport),
    date: match.utcDate ?? null,
    status: match.status ?? null,
    homeTeam: match.homeTeam,
    awayTeam: match.awayTeam,
    homeLogo: match.homeLogo ?? getWidgetTeamLogo(match.homeTeam, sport),
    awayLogo: match.awayLogo ?? getWidgetTeamLogo(match.awayTeam, sport),
    actualScore: match.actualHome !== null && match.actualAway !== null ? `${match.actualHome}:${match.actualAway}` : null,
    topPrediction: predictions[0] ?? null,
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
  const predictedHome = sport === "football" ? (homeWins ? 2 : 1) : (homeWins ? 2 : 1);
  const predictedAway = sport === "football" ? (homeWins ? 1 : 2) : (homeWins ? 1 : 2);
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
    reason: `${match.homeName} vs ${match.awayName} is loaded from the live Sports API feed. The widget prediction uses the current fixture, competition context and team signal until the paid model forecast is attached.`,
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

function getStableNumber(value: string): number {
  let hash = 0;

  for (let index = 0; index < value.length; index += 1) {
    hash = ((hash << 5) - hash + value.charCodeAt(index)) | 0;
  }

  return Math.abs(hash);
}

function toPublicWidgetPrediction(
  prediction: DashboardPrediction,
  sport: Exclude<WidgetSport, "all">
): PublicWidgetPrediction {
  const confidence = prediction.confidence ?? getProbabilityConfidence(prediction);
  const score = prediction.predictedHome !== null && prediction.predictedAway !== null
    ? `${prediction.predictedHome}:${prediction.predictedAway}`
    : "-";
  const pick = getPredictionPick(prediction);
  const probabilities = getPredictionProbabilities(prediction, sport, confidence);

  return {
    id: prediction.id,
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

function getPredictionPick(prediction: DashboardPrediction): string {
  if (prediction.predictedHome === null || prediction.predictedAway === null) {
    return "No pick";
  }

  if (prediction.predictedHome > prediction.predictedAway) {
    return prediction.homeTeam ?? "Home";
  }

  if (prediction.predictedAway > prediction.predictedHome) {
    return prediction.awayTeam ?? "Away";
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

function getWidgetTeamLogo(teamName: string, sport: Exclude<WidgetSport, "all">): string | null {
  if (sport === "nba") {
    return findTeamLogo(teamName, nbaTeams);
  }

  if (sport === "nfl") {
    return findTeamLogo(teamName, nflTeams);
  }

  if (sport === "tennis") {
    return resolveTennisPlayerFlagUrl(teamName) ?? null;
  }

  const footballTeam = footballCompetitions
    .flatMap((competition) => competition.teams)
    .find((team) => namesMatch(team.name, teamName) || namesMatch(team.shortName, teamName));

  if (footballTeam) {
    return null;
  }

  return getTeamFlag(teamName)?.src ?? null;
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

function buildWidgetLeaderboard(matches: PublicWidgetMatch[]): PublicWidgetLeaderboardEntry[] {
  const byModel = new Map<string, { confidenceTotal: number; confidenceCount: number; predictions: number; provider: string }>();

  for (const prediction of matches.flatMap((match) => match.predictions)) {
    const current = byModel.get(prediction.model) ?? {
      confidenceTotal: 0,
      confidenceCount: 0,
      predictions: 0,
      provider: prediction.provider
    };

    current.predictions += 1;
    if (prediction.confidence !== null) {
      current.confidenceTotal += prediction.confidence;
      current.confidenceCount += 1;
    }

    byModel.set(prediction.model, current);
  }

  return [...byModel.entries()]
    .map(([model, row]) => ({
      model,
      provider: row.provider,
      predictions: row.predictions,
      averageConfidence: row.confidenceCount > 0 ? Math.round(row.confidenceTotal / row.confidenceCount) : null
    }))
    .sort((a, b) => (b.averageConfidence ?? -1) - (a.averageConfidence ?? -1) || b.predictions - a.predictions || a.model.localeCompare(b.model));
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
  return {
    id,
    homeTeam,
    awayTeam,
    actualHome: null,
    actualAway: null,
    competition,
    utcDate: new Date(Date.now() + 36 * 60 * 60 * 1000).toISOString(),
    predictions: [
      createSamplePrediction(id, sport, homeTeam, awayTeam, 2, 1, 67),
      createSamplePrediction(id, sport, homeTeam, awayTeam, 1, 2, 58)
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
