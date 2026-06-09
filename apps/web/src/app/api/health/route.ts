/**
 * Purpose: Health endpoint for deployment checks.
 * Vercel, uptime monitors, or manual tests can call this before wiring real API routes.
 */
export function GET() {
  return Response.json({ ok: true, service: "world-cup-llm-rank" });
}
