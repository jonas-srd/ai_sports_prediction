import type { Metadata } from "next";
import type { ReactNode } from "react";

export const metadata: Metadata = {
  title: "Fußball-Prognosen, Teams & Wettbewerbe | Residual Sports",
  description: "KI-Fußballprognosen, Wahrscheinlichkeiten, Ergebnistipps, Wettbewerbe, Teamdaten und Match-Begründungen."
};

export default function GermanFootballLayout({ children }: Readonly<{ children: ReactNode }>) {
  return children;
}
