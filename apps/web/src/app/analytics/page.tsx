/**
 * Purpose: Product analytics dashboard for AI sports predictions.
 */
import type { Metadata } from "next";
import { AnalyticsPageContent } from "@/app/_route-content";

export const revalidate = 60;

export const metadata: Metadata = {
  title: "Prediction Model Analytics | Residual Sports",
  description: "Transparent performance, confidence and reliability analytics for Residual Sports prediction models.",
  alternates: { canonical: "/analytics" }
};

export default function AnalyticsPage() {
  return <AnalyticsPageContent locale="en" />;
}
