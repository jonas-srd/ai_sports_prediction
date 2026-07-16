import type { Metadata } from "next";
import { WidgetCustomerLogin } from "@/components/widget-customer-login";

export const metadata: Metadata = { title: "Widget-Kundenkonto anmelden", robots: { index: false, follow: false } };

export default function GermanWidgetCustomerLoginPage() {
  return <WidgetCustomerLogin locale="de" />;
}
