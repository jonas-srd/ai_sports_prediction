/**
 * Purpose: Root layout for the MVP dashboard.
 * The UI is intentionally simple so the 48h effort stays focused on data flow and scoring.
 */
import type { Metadata } from "next";
import type { ReactNode } from "react";
import { HtmlLangSync } from "@/components/html-lang-sync";
import { LocaleProvider } from "@/components/locale-provider";
import { SiteFooter } from "@/components/site-footer";
import { SiteNav } from "@/components/site-nav";
import { TimeZoneProvider } from "@/components/time-zone-provider";
import "./globals.css";

export const metadata: Metadata = {
  title: "LLM SoccerArena",
  description: "Compare soccer score predictions from multiple LLMs.",
  icons: {
    icon: [
      { url: "/favicon.ico", sizes: "32x32" },
      { url: "/favicon.png", sizes: "32x32", type: "image/png" },
      { url: "/site-icon.png", sizes: "1254x1254", type: "image/png" }
    ],
    apple: [{ url: "/apple-touch-icon.png", sizes: "180x180", type: "image/png" }]
  }
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
            <SiteFooter />
          </TimeZoneProvider>
        </LocaleProvider>
      </body>
    </html>
  );
}
