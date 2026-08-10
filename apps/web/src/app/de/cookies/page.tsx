import type { Metadata } from "next";
import { CookiePreferencesPage } from "@/components/cookie-consent";

export const metadata: Metadata = {
  title: "Residual Sports | Cookie-Einstellungen",
  description: "Cookie-Einstellungen fuer Residual Sports verwalten."
};

export default function GermanCookiesPage() {
  return <CookiePreferencesPage />;
}
