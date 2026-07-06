import type { Metadata } from "next";
import { SportPageContent } from "@/app/_route-content";

export const metadata: Metadata = {
  title: "Tennis Prognosen | AI Sport Prediction",
  description: "Tennis-Prognosen für Match Winner, Satzscores, Beläge, Serve-/Return-Splits und Draw-Pfade."
};

export default function GermanTennisPage() {
  return <SportPageContent locale="de" sport="tennis" />;
}
