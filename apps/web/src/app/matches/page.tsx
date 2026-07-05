/**
 * Purpose: Multi-sport match center page.
 * Fixtures, predictions and result checks are shown by day.
 */
import { MatchesPageContent } from "@/app/_route-content";

export const revalidate = 60;

export default function MatchesPage() {
  return <MatchesPageContent locale="en" />;
}
