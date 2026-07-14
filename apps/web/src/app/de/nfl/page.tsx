import type { Metadata } from "next";
import { NflPage as NflPageContent } from "@/components/nfl-pages";

export const metadata: Metadata = {
  title: "NFL Prognosen | AI Sports Prediction",
  description: "NFL-Prognosen für Wochenlinien, Abstände, Verletzungen, Teamstärke und Playoff-Pfade."
};

export default function GermanNflPage() {
  return <NflPageContent locale="de" />;
}
