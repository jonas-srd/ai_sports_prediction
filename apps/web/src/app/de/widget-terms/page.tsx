import type { Metadata } from "next";
import { WidgetTermsDocument } from "@/components/legal-documents";

export const metadata: Metadata = { title: "Widget-Lizenzbedingungen | Residual Sports", description: "B2B-AGB für Publisher-Widgets." };
export default function GermanWidgetTermsPage() { return <WidgetTermsDocument locale="de" />; }
