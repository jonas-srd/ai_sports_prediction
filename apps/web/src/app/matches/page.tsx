/**
 * Purpose: Match schedule page.
 * Fixtures are shown by day. The knockout bracket lives on the tournament tree page.
 */
import { getDashboardMatches } from "@/lib/dashboard-data";
import { MatchesSchedule } from "@/components/matches-schedule";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default function MatchesPage() {
  const matches = getDashboardMatches();

  return (
    <main className="shell scheduleShell">
      <section className="hero heroCentered compactHero">
        <p className="eyebrow">World Cup 2026</p>
        <h1>Schedule</h1>
        <p className="heroText">
          All fixtures by day. Click any match to inspect model picks.
        </p>
      </section>

      <MatchesSchedule matches={matches} />
    </main>
  );
}
