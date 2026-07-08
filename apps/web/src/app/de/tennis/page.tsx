import type { Metadata } from "next";
import { TennisPage } from "@/components/tennis-pages";

export const metadata: Metadata = {
  title: "Tennis Prognosen | AI Sport Prediction",
  description: "Tennis-Prognosen für Match Winner, Satzscores, Beläge, Serve-/Return-Splits und Draw-Pfade."
};

export default function GermanTennisPage() {
  return <TennisPage locale="de" />;
}
