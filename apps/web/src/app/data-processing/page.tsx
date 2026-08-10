import type { Metadata } from "next";
import { DataProcessingDocument } from "@/components/legal-documents";

export const metadata: Metadata = { title: "Data processing agreement | Residual Sports", description: "Article 28 GDPR data processing agreement for publisher widgets." };
export default function DataProcessingPage() { return <DataProcessingDocument locale="en" />; }
