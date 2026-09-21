/** Public business operations remain quarantined until explicitly released. */
export function isPublicBusinessEnabled(): boolean {
  return process.env.PUBLIC_BUSINESS_ENABLED === "1";
}

export function publicBusinessUnavailable(): Response | null {
  if (isPublicBusinessEnabled()) return null;
  return Response.json({
    error: "business_temporarily_unavailable",
    message: "Subscriptions, customer accounts and payments are temporarily unavailable."
  }, {
    status: 503,
    headers: { "cache-control": "private, no-store", "retry-after": "3600" }
  });
}
