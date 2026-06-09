/**
 * Purpose: Provides sample dashboard data until the Supabase API routes are connected.
 * This keeps the frontend buildable and useful before real match data exists.
 */
import { calculatePredictionScore } from "@/lib/scorer";

export type DashboardPrediction = {
  model: string;
  provider: string;
  predictedHome: number;
  predictedAway: number;
};

export type DashboardMatch = {
  id: string;
  homeTeam: string;
  awayTeam: string;
  actualHome: number;
  actualAway: number;
  predictions: DashboardPrediction[];
};

export const sampleMatches: DashboardMatch[] = [
  {
    id: "sample-1",
    homeTeam: "Germany",
    awayTeam: "France",
    actualHome: 2,
    actualAway: 1,
    predictions: [
      { model: "GPT-4o", provider: "OpenAI", predictedHome: 2, predictedAway: 1 },
      { model: "Claude 3.5 Sonnet", provider: "Anthropic", predictedHome: 1, predictedAway: 1 },
      { model: "Gemini Pro 1.5", provider: "Google", predictedHome: 2, predictedAway: 0 },
      { model: "Grok 2", provider: "xAI", predictedHome: 0, predictedAway: 1 }
    ]
  },
  {
    id: "sample-2",
    homeTeam: "Brazil",
    awayTeam: "Argentina",
    actualHome: 1,
    actualAway: 1,
    predictions: [
      { model: "GPT-4o", provider: "OpenAI", predictedHome: 1, predictedAway: 1 },
      { model: "Claude 3.5 Sonnet", provider: "Anthropic", predictedHome: 2, predictedAway: 1 },
      { model: "Gemini Pro 1.5", provider: "Google", predictedHome: 0, predictedAway: 0 },
      { model: "Grok 2", provider: "xAI", predictedHome: 1, predictedAway: 2 }
    ]
  }
];

export function getLeaderboard() {
  const totals = new Map<string, { model: string; provider: string; points: number; exact: number }>();

  for (const match of sampleMatches) {
    for (const prediction of match.predictions) {
      const score = calculatePredictionScore(
        { home: prediction.predictedHome, away: prediction.predictedAway },
        { home: match.actualHome, away: match.actualAway }
      );

      const current = totals.get(prediction.model) ?? {
        model: prediction.model,
        provider: prediction.provider,
        points: 0,
        exact: 0
      };

      current.points += score.points;
      current.exact += score.reason === "exact" ? 1 : 0;
      totals.set(prediction.model, current);
    }
  }

  return [...totals.values()].sort((a, b) => b.points - a.points || b.exact - a.exact);
}
