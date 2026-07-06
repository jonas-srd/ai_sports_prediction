import type { Metadata } from "next";
import { SportPageContent } from "@/app/_route-content";

export const metadata: Metadata = {
  title: "NFL Prognosen | AI Sport Prediction",
  description: "NFL-Prognosen für Weekly Lines, Margins, Verletzungen, Teamstärke und Playoff-Pfade."
};

export default function GermanNflPage() {
  return <SportPageContent locale="de" sport="nfl" />;
}
