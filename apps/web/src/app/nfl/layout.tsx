import type { Metadata } from "next";
import type { ReactNode } from "react";

export const metadata: Metadata = {
  title: "NFL Predictions, Teams & Games | Residual Sports",
  description: "AI NFL predictions, win probabilities, predicted scores, team data, schedules and matchup reasoning."
};

export default function NflLayout({ children }: Readonly<{ children: ReactNode }>) {
  return children;
}
