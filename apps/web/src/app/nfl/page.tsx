import type { Metadata } from "next";
import { NflPage as NflPageContent } from "@/components/nfl-pages";

export const metadata: Metadata = {
  title: "NFL Predictions | AI Sports Prediction",
  description: "NFL forecasts for weekly lines, margins, injuries, team strength and playoff paths."
};

export default function NflPage() {
  return <NflPageContent locale="en" />;
}
