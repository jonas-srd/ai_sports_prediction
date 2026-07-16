import type { Metadata } from "next";
import { WidgetCustomerPortal } from "@/components/widget-customer-portal";

export const metadata: Metadata = { title: "Widget-Kundenkonto", robots: { index: false, follow: false } };

export default function GermanWidgetCustomerAccountPage() {
  return <WidgetCustomerPortal locale="de" />;
}
