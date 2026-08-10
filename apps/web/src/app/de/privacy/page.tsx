import type { Metadata } from "next";
import { PrivacyDocument } from "@/components/legal-documents";

export const metadata: Metadata = { title: "Datenschutzerklärung | Residual Sports", description: "Datenschutzinformationen für Residual Sports." };
export default function GermanPrivacyPage() { return <PrivacyDocument locale="de" />; }
