import type { Metadata } from "next";
import { MatchesPageContent } from "@/app/_route-content";

export const revalidate = 60;

export const metadata: Metadata = {
  title: "Spiele & Scores | AI Sport Prediction",
  description: "Match Center mit Spielplan, Scores und Modelltipps für AI Sport Prediction."
};

export default function GermanMatchesPage() {
  return <MatchesPageContent locale="de" />;
}
