import type { Metadata } from "next";
import { WidgetCustomerPortal } from "@/components/widget-customer-portal";

export const metadata: Metadata = { title: "Widget customer account", robots: { index: false, follow: false } };

export default function WidgetCustomerAccountPage() {
  return <WidgetCustomerPortal locale="en" />;
}
