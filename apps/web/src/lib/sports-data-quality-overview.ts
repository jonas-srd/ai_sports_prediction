import { footballCompetitions } from "@/lib/football-data";
import {
  getFootballCompetitionApiSnapshot,
  getSportApiSnapshot,
  getSportsDataQualityTargets,
  type ApiSportId
} from "@/lib/sports-api-data";
import type { SportsDataQualityIssue } from "@/lib/sports-data-quality";

export type SportsDataQualityTargetStatus = {
  blocked: number;
  checked: number;
  competition: string;
  leagueId: string;
  message: string;
  published: number;
  slug: string | null;
  sourceStatus: "live" | "not_configured" | "error";
  sport: ApiSportId;
};

export type SportsDataQualityOverview = {
  blocked: number;
  checked: number;
  generatedAtUtc: string;
  issues: SportsDataQualityIssue[];
  published: number;
  sourceErrors: number;
  targets: SportsDataQualityTargetStatus[];
};

export async function getSportsDataQualityOverview(): Promise<SportsDataQualityOverview> {
  const configuredTargets = getSportsDataQualityTargets();
  const targetResults = await Promise.all(configuredTargets.map(async (target): Promise<SportsDataQualityTargetStatus & {
    issues: SportsDataQualityIssue[];
  }> => {
    const snapshot = target.sport === "football"
      ? await loadFootballSnapshot(target.slug)
      : await getSportApiSnapshot(target.sport);

    return {
      blocked: snapshot.quality.blocked,
      checked: snapshot.quality.checked,
      competition: target.competition,
      issues: snapshot.quality.issues,
      leagueId: target.leagueId,
      message: snapshot.message,
      published: snapshot.quality.published,
      slug: target.slug,
      sourceStatus: snapshot.status,
      sport: target.sport
    };
  }));
  const issues = dedupeIssues(targetResults.flatMap((target) => target.issues));

  return {
    blocked: targetResults.reduce((sum, target) => sum + target.blocked, 0),
    checked: targetResults.reduce((sum, target) => sum + target.checked, 0),
    generatedAtUtc: new Date().toISOString(),
    issues,
    published: targetResults.reduce((sum, target) => sum + target.published, 0),
    sourceErrors: targetResults.filter((target) => target.sourceStatus !== "live").length,
    targets: targetResults.map(({ issues: _issues, ...target }) => target)
  };
}

async function loadFootballSnapshot(slug: string | null) {
  const competition = footballCompetitions.find((candidate) => candidate.slug === slug);
  if (!competition) {
    throw new Error(`Configured football competition ${slug ?? "unknown"} is missing from the public catalogue.`);
  }
  return getFootballCompetitionApiSnapshot(competition);
}

function dedupeIssues(issues: SportsDataQualityIssue[]) {
  const seen = new Set<string>();
  return issues.filter((issue) => {
    const key = `${issue.matchId}:${issue.code}:${issue.message}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}
