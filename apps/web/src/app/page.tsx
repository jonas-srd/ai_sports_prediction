/**
 * Purpose: Main ranking dashboard.
 * Reads local SQLite data when available and falls back to sample data.
 */
import Link from "next/link";
import { getDashboardMatches } from "@/lib/dashboard-data";
import { HomeDashboard } from "@/components/home-dashboard";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default function HomePage() {
  const matches = getDashboardMatches();

  return (
    <main className="shell">
      <section className="hero heroCentered">
        <p className="eyebrow">LLM Kicktipp MVP</p>
        <h1>Which model predicts football best?</h1>
        <p className="heroText">
          World Cup 2026 forecasts from multiple LLMs, ranked with benchmark evaluation metrics.
        </p>
        <div className="heroActions">
          <Link className="primaryLink" href="/matches">View all matches</Link>
        </div>
      </section>

      <HomeDashboard matches={matches} />
    </main>
  );
}
