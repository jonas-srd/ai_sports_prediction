import type { MetadataRoute } from "next";

const base = "https://residualsports.com";
const lastModified = new Date();

const localizedRoutes = [
  ["", "/de"],
  ["/about", "/de/about"],
  ["/analytics", "/de/analytics"],
  ["/football", "/de/football"],
  ["/matches", "/de/matches"],
  ["/nba", "/de/nba"],
  ["/nba/matches", "/de/nba/spieltag"],
  ["/nba/table", "/de/nba/tabelle"],
  ["/nba/team-stats", "/de/nba/teamstatistik"],
  ["/nba/teams", "/de/nba/teams"],
  ["/nfl", "/de/nfl"],
  ["/nfl/matches", "/de/nfl/spieltag"],
  ["/nfl/table", "/de/nfl/tabelle"],
  ["/nfl/team-stats", "/de/nfl/teamstatistik"],
  ["/nfl/teams", "/de/nfl/teams"],
  ["/tennis", "/de/tennis"],
  ["/tennis/matches", "/de/tennis/vorhersagen"],
  ["/tennis/players", "/de/tennis/spieler"],
  ["/tennis/rankings", "/de/tennis/ranking"],
  ["/tennis/tournaments", "/de/tennis/turniere"],
  ["/tournament-tree", "/de/tournament-tree"],
  ["/widgets", "/de/widgets"],
  ["/privacy", "/de/privacy"],
  ["/cookies", "/de/cookies"],
  ["/impressum", "/de/impressum"],
  ["/widget-terms", "/de/widget-terms"],
  ["/data-processing", "/de/data-processing"]
] as const;

function priorityFor(path: string): number {
  if (path === "" || path === "/de") return 1;
  if (path.endsWith("/widgets")) return 0.9;
  return 0.7;
}

function changeFrequencyFor(path: string): "daily" | "monthly" {
  return /(?:privacy|cookies|impressum|terms|data-processing)/u.test(path) ? "monthly" : "daily";
}

export default function sitemap(): MetadataRoute.Sitemap {
  return localizedRoutes.flatMap(([englishPath, germanPath]) => {
    const languages = {
      en: `${base}${englishPath}`,
      de: `${base}${germanPath}`,
      "x-default": `${base}${englishPath}`
    };

    return [englishPath, germanPath].map((path) => ({
      alternates: { languages },
      changeFrequency: changeFrequencyFor(path),
      lastModified,
      priority: priorityFor(path),
      url: `${base}${path}`
    }));
  });
}
