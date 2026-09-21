import type { Metadata } from "next";
import { WidgetCustomerLogin } from "@/components/widget-customer-login";
import { BusinessUnavailable } from "@/components/business-unavailable";
import { isPublicBusinessEnabled } from "@/lib/public-business";

export const metadata: Metadata = { title: "Widget customer sign-in", robots: { index: false, follow: false } };

export default function WidgetCustomerLoginPage() {
  if (!isPublicBusinessEnabled()) return <BusinessUnavailable />;
  return <WidgetCustomerLogin locale="en" />;
}
