import type { Metadata } from "next";
import { NbaPage as NbaPageContent } from "@/components/nba-pages";

export const metadata: Metadata = {
  title: "NBA Predictions | AI Sports Prediction",
  description: "NBA forecasts for nightly matchups, player availability, pace, rest and playoff series."
};

export default function NbaPage() {
  return <NbaPageContent locale="en" />;
}
