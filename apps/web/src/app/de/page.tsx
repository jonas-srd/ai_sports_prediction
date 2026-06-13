import type { Metadata } from "next";
import { HomePageContent } from "@/app/_route-content";

export const revalidate = 60;

export const metadata: Metadata = {
  title: "LLM SoccerArena",
  description: "Vergleiche Fußball-Prognosen mehrerer LLMs."
};

export default function GermanHomePage() {
  return <HomePageContent locale="de" />;
}
