/**
 * Purpose: Research/product analytics dashboard for benchmark predictions.
 */
import { AnalyticsPageContent } from "@/app/_route-content";

export const revalidate = 60;

export default function AnalyticsPage() {
  return <AnalyticsPageContent locale="en" />;
}
