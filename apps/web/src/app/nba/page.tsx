import type { Metadata } from "next";
import { SportPageContent } from "@/app/_route-content";

export const metadata: Metadata = {
  title: "NBA Predictions | AI Sport Prediction",
  description: "NBA forecasts for nightly matchups, player availability, pace, rest and playoff series."
};

export default function NbaPage() {
  return <SportPageContent locale="en" sport="nba" />;
}
