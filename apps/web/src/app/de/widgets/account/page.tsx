import type { Metadata } from "next";
import { WidgetCustomerPortal } from "@/components/widget-customer-portal";
import { BusinessUnavailable } from "@/components/business-unavailable";
import { isPublicBusinessEnabled } from "@/lib/public-business";

export const metadata: Metadata = { title: "Widget-Kundenkonto", robots: { index: false, follow: false } };

export default function GermanWidgetCustomerAccountPage() {
  if (!isPublicBusinessEnabled()) return <BusinessUnavailable locale="de" />;
  return <WidgetCustomerPortal locale="de" />;
}
