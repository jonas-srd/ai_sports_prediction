/**
 * Purpose: Dedicated football tournament tree page.
 */
import type { Metadata } from "next";
import { TournamentTreePageContent } from "@/app/_route-content";

export const revalidate = 60;

export const metadata: Metadata = {
  title: "Football Tournament Tree | Residual Sports",
  description: "Explore tournament paths, fixtures and AI prediction context across football knockout rounds.",
  alternates: { canonical: "/tournament-tree" }
};

export default function TournamentTreePage() {
  return <TournamentTreePageContent locale="en" />;
}
