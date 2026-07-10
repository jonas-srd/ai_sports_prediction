import type { Metadata } from "next";
import { CookiePreferencesPage } from "@/components/cookie-consent";

export const metadata: Metadata = {
  title: "AI Sports Prediction | Cookie settings",
  description: "Manage cookie preferences for AI Sports Prediction."
};

export default function CookiesPage() {
  return <CookiePreferencesPage />;
}
