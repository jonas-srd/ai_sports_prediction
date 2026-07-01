import type { Metadata } from "next";
import { TournamentTreePageContent } from "@/app/_route-content";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export const metadata: Metadata = {
  title: "WM-Turnierbaum | AI Sports Prediction",
  description: "Gruppen und K.-o.-Baum der FIFA-Weltmeisterschaft 2026."
};

export default function GermanTournamentTreePage() {
  return <TournamentTreePageContent locale="de" />;
}
