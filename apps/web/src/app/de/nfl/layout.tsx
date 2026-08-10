import type { Metadata } from "next";
import type { ReactNode } from "react";

export const metadata: Metadata = {
  title: "NFL-Prognosen, Teams & Spiele | Residual Sports",
  description: "KI-NFL-Prognosen, Siegwahrscheinlichkeiten, Ergebnistipps, Teamdaten, Spielpläne und Match-Begründungen."
};

export default function GermanNflLayout({ children }: Readonly<{ children: ReactNode }>) {
  return children;
}
