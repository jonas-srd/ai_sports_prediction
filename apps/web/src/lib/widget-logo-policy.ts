export function getOfficialWidgetLogo(value: string | null | undefined): string | null {
  const logo = value?.trim();
  if (!logo || (!isStoredSportsAssetPath(logo) && !isRealRemoteSportsAssetUrl(logo))) {
    return null;
  }

  return logo;
}

export function isStoredSportsAssetPath(value: string | null | undefined): boolean {
  const candidate = value?.trim();
  return Boolean(candidate && /^\/sports-logos\/(?:teams|leagues)\/[a-z0-9-]+\.webp$/i.test(candidate));
}

export function isOfficialWidgetLogoUrl(value: string | null | undefined): boolean {
  return getOfficialWidgetLogo(value) !== null;
}

export function isRealRemoteSportsAssetUrl(value: string | null | undefined): boolean {
  const candidate = value?.trim();
  if (!candidate) {
    return false;
  }

  try {
    const url = new URL(candidate);
    if (url.protocol !== "https:") {
      return false;
    }

    const normalized = `${url.hostname}${url.pathname}`.toLowerCase();
    return ![
      "fallback",
      "placeholder",
      "placehold.",
      "placehold/",
      "dummy",
      "default-logo",
      "no-logo",
      "missing-logo"
    ].some((marker) => normalized.includes(marker));
  } catch {
    return false;
  }
}

export function isVerifiedTennisFlagUrl(value: string | null | undefined): boolean {
  const candidate = value?.trim();
  if (!candidate) {
    return false;
  }

  try {
    const url = new URL(candidate);
    return url.protocol === "https:"
      && (url.hostname === "flagcdn.com" || url.hostname.endsWith(".flagcdn.com"))
      && /\/[a-z]{2}\.(?:png|svg)$/i.test(url.pathname);
  } catch {
    return false;
  }
}
