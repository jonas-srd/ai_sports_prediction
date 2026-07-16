import type { Metadata } from "next";
import { WidgetTermsDocument } from "@/components/legal-documents";

export const metadata: Metadata = { title: "Widget-Lizenzbedingungen | AI Sports Prediction", description: "B2B-AGB für Publisher-Widgets." };
export default function GermanWidgetTermsPage() { return <WidgetTermsDocument locale="de" />; }
