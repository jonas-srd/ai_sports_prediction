import type { Metadata } from "next";
import type { ReactNode } from "react";

export const metadata: Metadata = {
  title: "Football Predictions, Teams & Competitions | Residual Sports",
  description: "AI football predictions, probabilities, predicted scores, competitions, team data and match reasoning."
};

export default function FootballLayout({ children }: Readonly<{ children: ReactNode }>) {
  return children;
}
