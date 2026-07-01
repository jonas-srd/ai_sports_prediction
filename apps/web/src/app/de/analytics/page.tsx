import type { Metadata } from "next";
import { AnalyticsPageContent } from "@/app/_route-content";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export const metadata: Metadata = {
  title: "Analyse | AI Sports Prediction",
  description: "Benchmark-Analyse der Modellprognosen zur FIFA-Weltmeisterschaft 2026."
};

export default function GermanAnalyticsPage() {
  return <AnalyticsPageContent locale="de" />;
}
