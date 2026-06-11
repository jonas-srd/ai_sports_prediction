import type { Metadata } from "next";
import { HomePageContent } from "@/app/_route-content";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export const metadata: Metadata = {
  title: "LLM SoccerArena",
  description: "Vergleiche Fussball-Prognosen mehrerer LLMs."
};

export default function GermanHomePage() {
  return <HomePageContent locale="de" />;
}
