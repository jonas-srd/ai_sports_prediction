import type { Metadata } from "next";
import { WidgetsPageContent } from "../../widgets/page";

export const metadata: Metadata = {
  title: "AI Sports Prediction | Redaktionelle Widgets",
  description: "Einbettbare KI-Sportprognose-Widgets für redaktionelle Artikel."
};

export default function GermanWidgetsPage() {
  return <WidgetsPageContent locale="de" />;
}
