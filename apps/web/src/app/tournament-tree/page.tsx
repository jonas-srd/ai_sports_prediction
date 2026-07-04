/**
 * Purpose: Dedicated World Cup knockout tournament tree page.
 */
import { TournamentTreePageContent } from "@/app/_route-content";

export const revalidate = 60;

export default function TournamentTreePage() {
  return <TournamentTreePageContent locale="en" />;
}
