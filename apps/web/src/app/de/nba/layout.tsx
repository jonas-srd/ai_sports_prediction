import type { Metadata } from "next";
import type { ReactNode } from "react";

export const metadata: Metadata = {
  title: "NBA-Prognosen, Teams & Spiele | Residual Sports",
  description: "KI-NBA-Prognosen, Siegwahrscheinlichkeiten, Ergebnistipps, Teamdaten, Spielpläne und Match-Begründungen."
};

export default function GermanNbaLayout({ children }: Readonly<{ children: ReactNode }>) {
  return children;
}
