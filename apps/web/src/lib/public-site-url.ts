import "server-only";

export function getPublicSiteUrl(requestUrl?: string): URL {
  const configured = process.env.PUBLIC_SITE_URL?.trim()
    || process.env.NEXT_PUBLIC_SITE_URL?.trim();
  const fallback = process.env.NODE_ENV === "production"
    ? "https://residualsports.com"
    : requestUrl || "http://127.0.0.1:3000";
  const url = new URL(configured || fallback);
  return new URL(url.origin);
}

export function getPublicSiteDestination(path: string, requestUrl?: string): URL {
  return new URL(path, getPublicSiteUrl(requestUrl));
}
