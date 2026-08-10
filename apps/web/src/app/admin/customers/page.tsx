import type { Metadata } from "next";
import { WidgetCustomerAdmin } from "@/components/widget-customer-admin";

export const metadata: Metadata = {
  title: "Widget-Kunden | Residual Sports",
  robots: { index: false, follow: false }
};

export default function WidgetCustomersPage() {
  return <WidgetCustomerAdmin />;
}
