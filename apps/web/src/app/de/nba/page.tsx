import type { Metadata } from "next";
import { NbaPage as NbaPageContent } from "@/components/nba-pages";

export const metadata: Metadata = {
  title: "NBA Prognosen | AI Sport Prediction",
  description: "NBA-Prognosen für Nightly Matchups, Player Availability, Pace, Rest und Playoff-Serien."
};

export default function GermanNbaPage() {
  return <NbaPageContent locale="de" />;
}
