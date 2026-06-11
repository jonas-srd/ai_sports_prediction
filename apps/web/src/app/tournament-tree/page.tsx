/**
 * Purpose: Dedicated World Cup knockout tournament tree page.
 */
import { getDashboardMatches } from "@/lib/dashboard-data";
import { TournamentTreeView } from "@/components/tournament-tree-view";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default function TournamentTreePage() {
  const matches = getDashboardMatches();

  return <TournamentTreeView matches={matches} />;
}
