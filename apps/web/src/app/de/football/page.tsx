import type { Metadata } from "next";
import { FootballOverviewPage } from "@/components/football-pages";

export const metadata: Metadata = {
  title: "Fußball Prognosen | Residual Sports",
  description: "Fußball-Wettbewerbe, Liga-Hubs, Teamseiten und KI-Prognose-Signale."
};

export const revalidate = 60;

export default function GermanFootballPage() {
  return <FootballOverviewPage locale="de" />;
}
