import type { Metadata } from "next";
import { SiteTermsDocument } from "@/components/legal-documents";

export const metadata: Metadata = {
  title: "Terms of Service | Residual Sports",
  description: "Terms governing the use of Residual Sports.",
  alternates: {
    canonical: "/terms",
    languages: { "en-US": "/terms", "de-DE": "/de/terms" }
  }
};

export default function TermsPage() {
  return <SiteTermsDocument locale="en" />;
}
