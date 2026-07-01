/**
 * Purpose: Shared dashboard view types independent of any database implementation.
 */
import type {
  AccessCondition,
  BenchmarkDisplayPrediction,
  ForecastHorizon,
  PromptStrategy,
  TournamentStage
} from "@/lib/benchmark-analytics";

export type DashboardPrediction = BenchmarkDisplayPrediction & {
  scorePoints: number | null;
  scoreReason: string | null;
};

export type DashboardMatch = {
  id: string;
  homeTeam: string;
  awayTeam: string;
  actualHome: number | null;
  actualAway: number | null;
  status?: string;
  utcDate?: string;
  competition?: string;
  venue?: string | null;
  stage?: TournamentStage;
  groupName?: string | null;
  isKnockout?: boolean;
  predictions: DashboardPrediction[];
};

export type DashboardLeaderboardEntry = {
  model: string;
  provider: string;
  points: number;
  exact: number;
  scored: number;
  pending: number;
  key?: string;
  forecastHorizon?: ForecastHorizon;
  accessCondition?: AccessCondition;
  promptStrategy?: PromptStrategy;
};

export type DashboardSpecialPrediction = {
  id: string;
  questionId: string;
  questionLabel: string;
  predictionType: "single_choice" | "multi_choice_fixed_k";
  k: number | null;
  model: string;
  provider: string;
  predictorId: string;
  accessCondition: AccessCondition;
  promptStrategy: PromptStrategy;
  forecastHorizon: ForecastHorizon;
  sampleId: number;
  finalPick: string | null;
  finalPicks: string[];
  confidence: number | null;
  reasoningSummary: string | null;
  validationStatus: string | null;
  isValidForScoring: boolean;
  isCorrect: boolean | null;
  questionScorePoints: number;
};

export const sampleMatches: DashboardMatch[] = [
  {
    id: "sample-1",
    homeTeam: "Germany",
    awayTeam: "France",
    actualHome: 2,
    actualAway: 1,
    venue: "Sample Stadium",
    stage: "group_stage",
    isKnockout: false,
    predictions: [
      createSamplePrediction("sample-1", "GPT-5.5", "OpenAI", 2, 1, 5, "exact score"),
      createSamplePrediction("sample-1", "Claude Opus 4.8", "Anthropic", 1, 1, 0, "miss"),
      createSamplePrediction("sample-1", "Gemini 3.1 Pro", "Google", 2, 0, 1, "tendency"),
      createSamplePrediction("sample-1", "Grok 4.3", "xAI", 0, 1, 0, "miss")
    ]
  },
  {
    id: "sample-2",
    homeTeam: "Brazil",
    awayTeam: "Argentina",
    actualHome: 1,
    actualAway: 1,
    venue: "Sample Stadium",
    stage: "group_stage",
    isKnockout: false,
    predictions: [
      createSamplePrediction("sample-2", "GPT-5.5", "OpenAI", 1, 1, 5, "exact score"),
      createSamplePrediction("sample-2", "Claude Opus 4.8", "Anthropic", 2, 1, 0, "miss"),
      createSamplePrediction("sample-2", "Gemini 3.1 Pro", "Google", 0, 0, 2, "goal difference"),
      createSamplePrediction("sample-2", "Grok 4.3", "xAI", 1, 2, 0, "miss")
    ]
  }
];

function createSamplePrediction(
  matchId: string,
  model: string,
  provider: string,
  predictedHome: number,
  predictedAway: number,
  scorePoints: number,
  scoreReason: string
): DashboardPrediction {
  return {
    id: `sample:${matchId}:${model}`,
    matchId,
    model,
    provider,
    predictorId: model,
    accessCondition: "not_applicable",
    promptStrategy: "not_applicable",
    forecastHorizon: "STAGE_OPENING",
    stage: "group_stage",
    matchDate: null,
    sampleId: 1,
    predictedHome,
    predictedAway,
    predictedFullHome: null,
    predictedFullAway: null,
    homeWin90Prob: null,
    draw90Prob: null,
    awayWin90Prob: null,
    homeWinFullProb: null,
    drawFullProb: null,
    awayWinFullProb: null,
    homeAdvancesProb: null,
    awayAdvancesProb: null,
    confidence: null,
    reason: scoreReason,
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
    exactScore90Correct: scorePoints === 5,
    goalDifference90Correct: scorePoints >= 2,
    tendency90CorrectFromScore: scorePoints > 0,
    homeGoalAbsError90: null,
    awayGoalAbsError90: null,
    totalGoalsAbsError90: null,
    goalDifferenceAbsError90: null,
    kicktippPoints90: scorePoints,
    advancementAccuracy: null,
    scoreResultMatchesProbArgmax90: null,
    scorePoints,
    scoreReason
  };
}
