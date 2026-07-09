import type { Metadata } from "next";
import { AnalyticsPageContent } from "@/app/_route-content";

export const revalidate = 60;

export const metadata: Metadata = {
  title: "KI-Analyse | AI Sports Prediction",
  description: "Analyse von Modellgenauigkeit, Konfidenz und Zuverlässigkeit für Sportprognosen."
};

export default function GermanAnalyticsPage() {
  return <AnalyticsPageContent locale="de" />;
}
