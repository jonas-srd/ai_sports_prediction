import type { Metadata } from "next";
import type { ReactNode } from "react";

export const metadata: Metadata = {
  title: "Tennis-Prognosen, Rankings & Spieler | Residual Sports",
  description: "KI-Tennisprognosen, Siegwahrscheinlichkeiten, Satz-Tipps, Spieler-Rankings, Turniere und Match-Begründungen."
};

export default function GermanTennisLayout({ children }: Readonly<{ children: ReactNode }>) {
  return children;
}
