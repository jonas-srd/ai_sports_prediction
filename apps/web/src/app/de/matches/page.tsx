import type { Metadata } from "next";
import { MatchesPageContent } from "@/app/_route-content";

export const revalidate = 60;

export const metadata: Metadata = {
  title: "Spiele | LLM SoccerArena",
  description: "Spielplan und Modelltipps zur FIFA-Weltmeisterschaft 2026."
};

export default function GermanMatchesPage() {
  return <MatchesPageContent locale="de" />;
}
