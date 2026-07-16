import type { Metadata } from "next";
import { WidgetCustomerLogin } from "@/components/widget-customer-login";

export const metadata: Metadata = { title: "Widget customer sign-in", robots: { index: false, follow: false } };

export default function WidgetCustomerLoginPage() {
  return <WidgetCustomerLogin locale="en" />;
}
