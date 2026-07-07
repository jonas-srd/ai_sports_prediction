import type { Metadata } from "next";
import { NflPage as NflPageContent } from "@/components/nfl-pages";

export const metadata: Metadata = {
  title: "NFL Prognosen | AI Sport Prediction",
  description: "NFL-Prognosen für Weekly Lines, Margins, Verletzungen, Teamstärke und Playoff-Pfade."
};

export default function GermanNflPage() {
  return <NflPageContent locale="de" />;
}
