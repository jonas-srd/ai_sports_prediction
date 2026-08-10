import type { Metadata } from "next";
import { RevenueDashboard } from "@/components/revenue-dashboard";

export const metadata: Metadata = { title: "Umsatz-Cockpit | Residual Sports", robots: { index: false, follow: false } };

export default function RevenueAdminPage() {
  return <RevenueDashboard />;
}
