import sportsLogoManifest from "@/generated/sports-logo-manifest.json";

/**
 * Local fallback used only when TheSportsDB has no team badge available.
 * Keeping this as a data URI prevents an implicit request to another sports provider.
 */
export function createTeamFallbackLogo(label: string, background = "#10231b", foreground = "#7df5c1"): string {
  const safeLabel = label.toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 4) || "TEAM";
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 128 128" role="img" aria-label="${safeLabel}"><rect width="128" height="128" rx="24" fill="${background}"/><circle cx="64" cy="64" r="48" fill="none" stroke="${foreground}" stroke-width="5"/><text x="64" y="72" text-anchor="middle" font-family="Arial,sans-serif" font-size="30" font-weight="700" fill="${foreground}">${safeLabel}</text></svg>`;
  return `data:image/svg+xml,${encodeURIComponent(svg)}`;
}

export function getStoredTeamLogo(id: string | null | undefined, name: string | null | undefined): string | null {
  const idKey = id?.trim();
  if (idKey && idKey in sportsLogoManifest.teamsById) {
    return sportsLogoManifest.teamsById[idKey as keyof typeof sportsLogoManifest.teamsById];
  }

  const nameKey = normalizeStoredLogoName(name ?? "");
  return nameKey && nameKey in sportsLogoManifest.teamsByName
    ? sportsLogoManifest.teamsByName[nameKey as keyof typeof sportsLogoManifest.teamsByName]
    : null;
}

export function getStoredCompetitionLogo(slug: string): string | null {
  return slug in sportsLogoManifest.leagues
    ? sportsLogoManifest.leagues[slug as keyof typeof sportsLogoManifest.leagues]
    : null;
}

function normalizeStoredLogoName(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}
