import type { Metadata } from "next";
import { HomePageContent } from "@/app/_route-content";

export const revalidate = 60;
export const dynamic = "force-static";

export const metadata: Metadata = {
  title: "Residual Sports | KI-Sportprognosen & Analysen",
  description: "Forschungsbasierte KI-Sportprognosen mit Wahrscheinlichkeiten, Ergebnistipps und Begründungen für Fußball, NFL, NBA und Tennis.",
  alternates: {
    canonical: "/de",
    languages: {
      "en-US": "/",
      "de-DE": "/de",
      "x-default": "/"
    }
  },
  openGraph: {
    title: "Residual Sports | KI-Sportprognosen & Analysen",
    description: "Forschungsbasierte KI-Prognosen, Wahrscheinlichkeiten und Begründungen für Fußball, NFL, NBA und Tennis.",
    locale: "de_DE",
    alternateLocale: ["en_US"],
    url: "/de"
  }
};

export default function GermanHomePage() {
  return <HomePageContent locale="de" />;
}
