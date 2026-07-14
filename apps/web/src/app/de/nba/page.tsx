import type { Metadata } from "next";
import { NbaPage as NbaPageContent } from "@/components/nba-pages";

export const metadata: Metadata = {
  title: "NBA Prognosen | AI Sports Prediction",
  description: "NBA-Prognosen für Spielabende, Spieler-Verfügbarkeit, Tempo, Erholung und Playoff-Serien."
};

export default function GermanNbaPage() {
  return <NbaPageContent locale="de" />;
}
