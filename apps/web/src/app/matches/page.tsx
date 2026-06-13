/**
 * Purpose: Match schedule page.
 * Fixtures are shown by day. The knockout bracket lives on the tournament tree page.
 */
import { MatchesPageContent } from "@/app/_route-content";

export const revalidate = 60;

export default function MatchesPage() {
  return <MatchesPageContent locale="en" />;
}
