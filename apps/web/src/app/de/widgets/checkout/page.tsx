import type { Metadata } from "next";
import { WidgetCheckoutPageContent } from "../../../widgets/checkout/page";

export const metadata: Metadata = {
  title: "Widget-Checkout | AI Sports Prediction",
  description: "Rechnungsdaten für AI Sports Prediction Widgets vervollständigen.",
  robots: { index: false, follow: false }
};

export default function GermanWidgetCheckoutPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  return <WidgetCheckoutPageContent locale="de" searchParams={searchParams} />;
}
