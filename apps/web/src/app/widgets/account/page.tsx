import type { Metadata } from "next";
import { WidgetCustomerPortal } from "@/components/widget-customer-portal";
import { BusinessUnavailable } from "@/components/business-unavailable";
import { isPublicBusinessEnabled } from "@/lib/public-business";

export const metadata: Metadata = { title: "Widget customer account", robots: { index: false, follow: false } };

export default function WidgetCustomerAccountPage() {
  if (!isPublicBusinessEnabled()) return <BusinessUnavailable />;
  return <WidgetCustomerPortal locale="en" />;
}
