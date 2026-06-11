/**
 * Purpose: Root layout for the MVP dashboard.
 * The UI is intentionally simple so the 48h effort stays focused on data flow and scoring.
 */
import type { Metadata } from "next";
import type { ReactNode } from "react";
import { HtmlLangSync } from "@/components/html-lang-sync";
import { LocaleProvider } from "@/components/locale-provider";
import { SiteNav } from "@/components/site-nav";
import { TimeZoneProvider } from "@/components/time-zone-provider";
import "./globals.css";

export const metadata: Metadata = {
  title: "LLM SoccerArena",
  description: "Compare football score predictions from multiple LLMs."
};

export default function RootLayout({ children }: Readonly<{ children: ReactNode }>) {
  return (
    <html lang="en">
      <body>
        <LocaleProvider>
          <TimeZoneProvider>
            <HtmlLangSync />
            <SiteNav />
            {children}
          </TimeZoneProvider>
        </LocaleProvider>
      </body>
    </html>
  );
}
