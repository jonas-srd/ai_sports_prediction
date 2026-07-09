import type { Metadata } from "next";
import { TournamentTreePageContent } from "@/app/_route-content";

export const revalidate = 60;

export const metadata: Metadata = {
  title: "Turniere | AI Sports Prediction",
  description: "Fußball-Turnierpfade, Gruppen und K.-o.-Baum für AI Sports Prediction."
};

export default function GermanTournamentTreePage() {
  return <TournamentTreePageContent locale="de" />;
}
