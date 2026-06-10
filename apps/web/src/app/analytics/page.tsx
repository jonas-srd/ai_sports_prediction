/**
 * Purpose: Research/product analytics dashboard for benchmark predictions.
 */
import { AnalyticsDashboard } from "@/components/analytics-dashboard";
import { getBenchmarkPredictions } from "@/lib/dashboard-data";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default function AnalyticsPage() {
  const predictions = getBenchmarkPredictions().filter((prediction) => !prediction.id.startsWith("legacy:"));

  return (
    <main className="shell analyticsShell">
      <section className="hero heroCentered compactHero">
        <p className="eyebrow">WorldCupForecastBench 2026</p>
        <h1>Analytics</h1>
        <p className="heroText">
          Compare model performance across horizons, access conditions, prompt strategies, stages, and reliability metrics.
        </p>
      </section>

      <AnalyticsDashboard predictions={predictions} />
    </main>
  );
}
