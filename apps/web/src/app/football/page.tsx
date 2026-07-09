import type { Metadata } from "next";
import { FootballOverviewPage } from "@/components/football-pages";

export const metadata: Metadata = {
  title: "Football Predictions | AI Sport Prediction",
  description: "Football competitions, league hubs, team pages and AI prediction signals."
};

export const dynamic = "force-dynamic";

export default function FootballPage() {
  return <FootballOverviewPage locale="en" />;
}
