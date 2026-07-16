import type { Metadata } from "next";
import { PrivacyDocument } from "@/components/legal-documents";

export const metadata: Metadata = { title: "Datenschutzerklärung | AI Sports Prediction", description: "Datenschutzinformationen für AI Sports Prediction." };
export default function GermanPrivacyPage() { return <PrivacyDocument locale="de" />; }
