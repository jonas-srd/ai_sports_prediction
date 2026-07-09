import type { Metadata } from "next";
import { FootballOverviewPage } from "@/components/football-pages";

export const metadata: Metadata = {
  title: "Fußball Prognosen | AI Sports Prediction",
  description: "Fußball-Wettbewerbe, Liga-Hubs, Teamseiten und KI-Prognose-Signale."
};

export const dynamic = "force-dynamic";

export default function GermanFootballPage() {
  return <FootballOverviewPage locale="de" />;
}
