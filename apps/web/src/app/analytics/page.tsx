/**
 * Purpose: Research/product analytics dashboard for benchmark predictions.
 */
import { AnalyticsPageContent } from "@/app/_route-content";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default function AnalyticsPage() {
  return <AnalyticsPageContent locale="en" />;
}
