import type { Metadata } from "next";
import { HomePageContent } from "@/app/_route-content";

export const revalidate = 60;

export const metadata: Metadata = {
  title: "AI Sports Prediction",
  description: "KI-Prognosen, Match-Signale und Modellanalysen für Fußball, NFL, NBA und Tennis."
};

export default function GermanHomePage() {
  return <HomePageContent locale="de" />;
}
