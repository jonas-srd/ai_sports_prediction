import type { Metadata } from "next";
import { WidgetTermsDocument } from "@/components/legal-documents";

export const metadata: Metadata = { title: "Widget terms | AI Sports Prediction", description: "B2B widget licence terms." };
export default function WidgetTermsPage() { return <WidgetTermsDocument locale="en" />; }
