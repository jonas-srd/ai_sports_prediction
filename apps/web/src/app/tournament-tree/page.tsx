/**
 * Purpose: Dedicated World Cup knockout tournament tree page.
 */
import { TournamentTreePageContent } from "@/app/_route-content";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default function TournamentTreePage() {
  return <TournamentTreePageContent locale="en" />;
}
