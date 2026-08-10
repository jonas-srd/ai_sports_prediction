import type { Metadata } from "next";
import type { ReactNode } from "react";

export const metadata: Metadata = {
  title: "NBA Predictions, Teams & Games | Residual Sports",
  description: "AI NBA predictions, win probabilities, predicted scores, team data, schedules and matchup reasoning."
};

export default function NbaLayout({ children }: Readonly<{ children: ReactNode }>) {
  return children;
}
