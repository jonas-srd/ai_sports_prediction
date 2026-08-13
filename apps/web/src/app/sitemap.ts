import type { MetadataRoute } from "next";

const base = "https://residualsports.com";
const lastModified = new Date();

const routes = ["", "/about", "/analytics", "/football", "/matches", "/nba", "/nba/matches", "/nba/table", "/nba/team-stats", "/nba/teams", "/nfl", "/nfl/matches", "/nfl/table", "/nfl/team-stats", "/nfl/teams", "/tennis", "/tennis/matches", "/tennis/players", "/tennis/rankings", "/tennis/tournaments", "/tournament-tree", "/widgets", "/privacy", "/terms", "/cookies", "/impressum", "/widget-terms", "/data-processing"] as const;
const localePrefixes = ["en", "de", "es", "pt", "fr", "it"] as const;

function localizedPath(path: string, locale: typeof localePrefixes[number]): string {
  if (locale === "en") return path;
  return path ? `/${locale}${path}` : `/${locale}`;
}

function priorityFor(path: string): number {
  if (path === "" || /^\/(?:de|es|pt|fr|it)$/u.test(path)) return 1;
  if (path.endsWith("/widgets")) return 0.9;
  return 0.7;
}

function changeFrequencyFor(path: string): "daily" | "monthly" {
  return /(?:privacy|cookies|impressum|terms|data-processing)/u.test(path) ? "monthly" : "daily";
}

export default function sitemap(): MetadataRoute.Sitemap {
  return routes.flatMap((route) => {
    const languages = Object.fromEntries(localePrefixes.map((locale) => [locale, `${base}${localizedPath(route, locale)}`]));
    languages["x-default"] = `${base}${route}`;

    return localePrefixes.map((locale) => {
      const path = localizedPath(route, locale);
      return ({
      alternates: { languages },
      changeFrequency: changeFrequencyFor(path),
      lastModified,
      priority: priorityFor(path),
      url: `${base}${path}`
      });
    });
  });
}
