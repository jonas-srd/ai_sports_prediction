import type { Metadata } from "next";
import { AnalyticsPageContent } from "@/app/_route-content";

export const revalidate = 60;

export const metadata: Metadata = {
  title: "Analyse | AI Sport Prediction",
  description: "Benchmark-Analyse der Modellprognosen zur FIFA-Weltmeisterschaft 2026."
};

export default function GermanAnalyticsPage() {
  return <AnalyticsPageContent locale="de" />;
}
