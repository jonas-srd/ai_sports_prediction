/**
 * Local fallback used only when TheSportsDB has no team badge available.
 * Keeping this as a data URI prevents an implicit request to another sports provider.
 */
export function createTeamFallbackLogo(label: string, background = "#10231b", foreground = "#7df5c1"): string {
  const safeLabel = label.toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 4) || "TEAM";
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 128 128" role="img" aria-label="${safeLabel}"><rect width="128" height="128" rx="24" fill="${background}"/><circle cx="64" cy="64" r="48" fill="none" stroke="${foreground}" stroke-width="5"/><text x="64" y="72" text-anchor="middle" font-family="Arial,sans-serif" font-size="30" font-weight="700" fill="${foreground}">${safeLabel}</text></svg>`;
  return `data:image/svg+xml,${encodeURIComponent(svg)}`;
}
