import type { Metadata } from "next";
import { SportPageContent } from "@/app/_route-content";

export const metadata: Metadata = {
  title: "NFL Predictions | AI Sport Prediction",
  description: "NFL forecasts for weekly lines, margins, injuries, team strength and playoff paths."
};

export default function NflPage() {
  return <SportPageContent locale="en" sport="nfl" />;
}
