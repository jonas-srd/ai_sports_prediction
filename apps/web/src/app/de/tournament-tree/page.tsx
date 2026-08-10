import type { Metadata } from "next";
import { TournamentTreePageContent } from "@/app/_route-content";

export const revalidate = 60;

export const metadata: Metadata = {
  title: "Turniere | Residual Sports",
  description: "Fußball-Turnierpfade, Gruppen und K.-o.-Baum für Residual Sports."
};

export default function GermanTournamentTreePage() {
  return <TournamentTreePageContent locale="de" />;
}
