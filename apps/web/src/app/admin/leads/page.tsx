import type { Metadata } from "next";
import { WidgetLeadAdmin } from "@/components/widget-lead-admin";

export const metadata: Metadata = { title: "Lead Cockpit | AI Sports Prediction", robots: { index: false, follow: false } };

export default function WidgetLeadsAdminPage() {
  return <WidgetLeadAdmin />;
}
