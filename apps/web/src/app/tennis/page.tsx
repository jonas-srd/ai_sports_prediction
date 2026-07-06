import type { Metadata } from "next";
import { SportPageContent } from "@/app/_route-content";

export const metadata: Metadata = {
  title: "Tennis Predictions | AI Sport Prediction",
  description: "Tennis forecasts for match winners, set scores, surfaces, serve-return splits and draw paths."
};

export default function TennisPage() {
  return <SportPageContent locale="en" sport="tennis" />;
}
