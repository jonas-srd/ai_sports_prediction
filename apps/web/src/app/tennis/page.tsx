import type { Metadata } from "next";
import { TennisPage } from "@/components/tennis-pages";

export const metadata: Metadata = {
  title: "Tennis Predictions | AI Sport Prediction",
  description: "Tennis forecasts for match winners, set scores, surfaces, serve-return splits and draw paths."
};

export default function EnglishTennisPage() {
  return <TennisPage locale="en" />;
}
