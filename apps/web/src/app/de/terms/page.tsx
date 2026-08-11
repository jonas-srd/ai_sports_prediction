import type { Metadata } from "next";
import { SiteTermsDocument } from "@/components/legal-documents";

export const metadata: Metadata = {
  title: "Nutzungsbedingungen | Residual Sports",
  description: "Nutzungsbedingungen für Residual Sports.",
  alternates: {
    canonical: "/de/terms",
    languages: { "en-US": "/terms", "de-DE": "/de/terms" }
  }
};

export default function GermanTermsPage() {
  return <SiteTermsDocument locale="de" />;
}
