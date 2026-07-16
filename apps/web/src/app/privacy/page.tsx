import type { Metadata } from "next";
import { PrivacyDocument } from "@/components/legal-documents";

export const metadata: Metadata = { title: "Privacy notice | AI Sports Prediction", description: "Privacy information for AI Sports Prediction." };
export default function PrivacyPage() { return <PrivacyDocument locale="en" />; }
