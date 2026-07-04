import type { Metadata } from "next";
import { TournamentTreePageContent } from "@/app/_route-content";

export const revalidate = 60;

export const metadata: Metadata = {
  title: "WM-Turnierbaum | AI Sport Prediction",
  description: "Gruppen und K.-o.-Baum der FIFA-Weltmeisterschaft 2026."
};

export default function GermanTournamentTreePage() {
  return <TournamentTreePageContent locale="de" />;
}
