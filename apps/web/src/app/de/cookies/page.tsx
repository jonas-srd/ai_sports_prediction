import type { Metadata } from "next";
import { CookiePreferencesPage } from "@/components/cookie-consent";

export const metadata: Metadata = {
  title: "AI Sports Prediction | Cookie-Einstellungen",
  description: "Cookie-Einstellungen fuer AI Sports Prediction verwalten."
};

export default function GermanCookiesPage() {
  return <CookiePreferencesPage />;
}
