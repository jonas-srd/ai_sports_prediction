import type { Metadata } from "next";
import { MatchesPageContent } from "@/app/_route-content";

export const revalidate = 60;

export const metadata: Metadata = {
  title: "Spiele & Scores | Residual Sports",
  description: "Match Center mit Spielplan, Scores und Modelltipps für Residual Sports."
};

export default function GermanMatchesPage() {
  return <MatchesPageContent locale="de" />;
}
