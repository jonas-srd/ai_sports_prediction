/**
 * Purpose: Main Residual Sports frontend.
 * Reads production data through the dedicated API and falls back to sample data locally.
 */
import type { Metadata } from "next";
import { HomePageContent } from "@/app/_route-content";

export const revalidate = 60;
export const dynamic = "force-static";

const description = "Research-built AI sports predictions with probabilities, predicted scores and reasoning for football, NFL, NBA and tennis.";

export const metadata: Metadata = {
  title: "Residual Sports | AI Sports Predictions & Analytics",
  description,
  alternates: {
    canonical: "/",
    languages: {
      "en-US": "/",
      "de-DE": "/de",
      "x-default": "/"
    }
  },
  openGraph: {
    title: "Residual Sports | AI Sports Predictions & Analytics",
    description,
    locale: "en_US",
    alternateLocale: ["de_DE"],
    url: "/"
  }
};

export default function HomePage() {
  const structuredData = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "Organization",
        "@id": "https://residualsports.com/#organization",
        name: "Residual Sports",
        url: "https://residualsports.com/",
        logo: "https://residualsports.com/site-icon.png",
        description
      },
      {
        "@type": "WebSite",
        "@id": "https://residualsports.com/#website",
        name: "Residual Sports",
        url: "https://residualsports.com/",
        description,
        inLanguage: ["en", "de"],
        publisher: { "@id": "https://residualsports.com/#organization" }
      }
    ]
  };

  return (
    <>
      <script
        dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData).replace(/</g, "\\u003c") }}
        type="application/ld+json"
      />
      <HomePageContent locale="en" />
    </>
  );
}
