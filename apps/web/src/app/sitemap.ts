import type { MetadataRoute } from "next";

const base = "https://www.ai-sports-prediction.net";

const paths = [
  "",
  "/about",
  "/analytics",
  "/football",
  "/matches",
  "/nba",
  "/nba/matches",
  "/nba/table",
  "/nba/teams",
  "/nfl",
  "/nfl/matches",
  "/nfl/table",
  "/nfl/teams",
  "/tennis",
  "/tennis/matches",
  "/tennis/players",
  "/tennis/rankings",
  "/tennis/tournaments",
  "/widgets",
  "/privacy",
  "/cookies",
  "/impressum",
  "/widget-terms",
  "/data-processing",
  "/de",
  "/de/about",
  "/de/analytics",
  "/de/football",
  "/de/matches",
  "/de/nba",
  "/de/nfl",
  "/de/tennis",
  "/de/widgets",
  "/de/privacy",
  "/de/cookies",
  "/de/impressum",
  "/de/widget-terms",
  "/de/data-processing"
] as const;

export default function sitemap(): MetadataRoute.Sitemap {
  const now = new Date();
  return paths.map((path) => ({
    changeFrequency: path.includes("privacy") || path.includes("terms") || path.includes("impressum") ? "monthly" : "daily",
    lastModified: now,
    priority: path === "" || path === "/de" ? 1 : path.endsWith("/widgets") ? 0.9 : 0.7,
    url: `${base}${path}`
  }));
}
