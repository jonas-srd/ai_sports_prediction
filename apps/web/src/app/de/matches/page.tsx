import type { Metadata } from "next";
import { MatchesPageContent } from "@/app/_route-content";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export const metadata: Metadata = {
  title: "Spiele | AI Sports Prediction",
  description: "Spielplan und Modelltipps zur FIFA-Weltmeisterschaft 2026."
};

export default function GermanMatchesPage() {
  return <MatchesPageContent locale="de" />;
}
