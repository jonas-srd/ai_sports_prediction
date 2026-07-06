import type { Metadata } from "next";
import { SportPageContent } from "@/app/_route-content";

export const metadata: Metadata = {
  title: "NBA Prognosen | AI Sport Prediction",
  description: "NBA-Prognosen für Nightly Matchups, Player Availability, Pace, Rest und Playoff-Serien."
};

export default function GermanNbaPage() {
  return <SportPageContent locale="de" sport="nba" />;
}
