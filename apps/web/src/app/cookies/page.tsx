import type { Metadata } from "next";
import { CookiePreferencesPage } from "@/components/cookie-consent";

export const metadata: Metadata = {
  title: "Residual Sports | Cookie settings",
  description: "Manage cookie preferences for Residual Sports."
};

export default function CookiesPage() {
  return <CookiePreferencesPage />;
}
