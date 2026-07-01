/**
 * Purpose: Health endpoint for deployment checks.
 * Railway, uptime monitors, or manual tests can call this before wiring real API routes.
 */
export function GET() {
  return Response.json({ ok: true, service: "ai-sports-prediction-web" });
}
