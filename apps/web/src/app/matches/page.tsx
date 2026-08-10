/**
 * Purpose: Multi-sport match center page.
 * Fixtures, predictions and result checks are shown by day.
 */
import type { Metadata } from "next";
import { MatchesPageContent } from "@/app/_route-content";

export const revalidate = 60;

export const metadata: Metadata = {
  title: "Upcoming Games & AI Predictions | Residual Sports",
  description: "Upcoming football, NFL, NBA and tennis games with AI predictions, probabilities, predicted scores and reasoning.",
  alternates: { canonical: "/matches" }
};

export default function MatchesPage() {
  return <MatchesPageContent locale="en" />;
}
