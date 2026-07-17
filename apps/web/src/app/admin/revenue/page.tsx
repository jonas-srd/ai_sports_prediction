import type { Metadata } from "next";
import { RevenueDashboard } from "@/components/revenue-dashboard";

export const metadata: Metadata = { title: "Umsatz-Cockpit | AI Sports Prediction", robots: { index: false, follow: false } };

export default function RevenueAdminPage() {
  return <RevenueDashboard />;
}
