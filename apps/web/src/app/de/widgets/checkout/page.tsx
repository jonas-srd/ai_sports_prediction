import type { Metadata } from "next";
import { WidgetCheckoutPageContent } from "../../../widgets/checkout/page";

export const metadata: Metadata = {
  title: "Widget-Checkout | Residual Sports",
  description: "Rechnungsdaten für Residual Sports Widgets vervollständigen.",
  robots: { index: false, follow: false }
};

export default function GermanWidgetCheckoutPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  return <WidgetCheckoutPageContent locale="de" searchParams={searchParams} />;
}
