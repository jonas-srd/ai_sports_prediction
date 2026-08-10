import type { Metadata } from "next";
import { PrivacyDocument } from "@/components/legal-documents";

export const metadata: Metadata = { title: "Privacy notice | Residual Sports", description: "Privacy information for Residual Sports." };
export default function PrivacyPage() { return <PrivacyDocument locale="en" />; }
