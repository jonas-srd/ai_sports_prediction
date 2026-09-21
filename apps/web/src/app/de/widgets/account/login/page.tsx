import type { Metadata } from "next";
import { WidgetCustomerLogin } from "@/components/widget-customer-login";
import { BusinessUnavailable } from "@/components/business-unavailable";
import { isPublicBusinessEnabled } from "@/lib/public-business";

export const metadata: Metadata = { title: "Widget-Kundenkonto anmelden", robots: { index: false, follow: false } };

export default function GermanWidgetCustomerLoginPage() {
  if (!isPublicBusinessEnabled()) return <BusinessUnavailable locale="de" />;
  return <WidgetCustomerLogin locale="de" />;
}
