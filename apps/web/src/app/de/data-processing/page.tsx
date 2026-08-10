import type { Metadata } from "next";
import { DataProcessingDocument } from "@/components/legal-documents";

export const metadata: Metadata = { title: "Auftragsverarbeitungsvertrag | Residual Sports", description: "AVV nach Art. 28 DSGVO für Publisher-Widgets." };
export default function GermanDataProcessingPage() { return <DataProcessingDocument locale="de" />; }
