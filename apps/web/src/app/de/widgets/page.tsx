import type { Metadata } from "next";
import { WidgetsPageContent } from "../../widgets/page";

export const metadata: Metadata = {
  title: "Residual Sports | Redaktionelle Widgets",
  description: "Einbettbare KI-Sportprognose-Widgets für redaktionelle Artikel.",
  alternates: {
    canonical: "/de/widgets",
    languages: { "de-DE": "/de/widgets", "en-US": "/widgets", "x-default": "/widgets" }
  }
};

export default function GermanWidgetsPage() {
  return <WidgetsPageContent locale="de" />;
}
