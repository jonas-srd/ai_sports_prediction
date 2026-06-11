/**
 * Purpose: Root layout for the MVP dashboard.
 * The UI is intentionally simple so the 48h effort stays focused on data flow and scoring.
 */
import type { Metadata } from "next";
import type { ReactNode } from "react";
import Link from "next/link";
import { TimeZoneProvider } from "@/components/time-zone-provider";
import { TimeZoneSelect } from "@/components/time-zone-select";
import "./globals.css";

export const metadata: Metadata = {
  title: "LLM SoccerArena",
  description: "Compare football score predictions from multiple LLMs."
};

export default function RootLayout({ children }: Readonly<{ children: ReactNode }>) {
  return (
    <html lang="en">
      <body>
        <TimeZoneProvider>
          <header className="siteNav">
            <div className="siteNavInner">
              <Link className="siteNavLogo" href="/">LLM SoccerArena</Link>
              <nav className="siteNavLinks">
                <Link href="/">Home</Link>
                <Link href="/about">About</Link>
                <Link href="/tournament-tree">World Cup Bracket</Link>
                <Link href="/matches">Matches</Link>
                <Link href="/analytics">Analytics</Link>
                <Link href="/impressum">Legal Notice</Link>
              </nav>
              <TimeZoneSelect />
            </div>
          </header>
          {children}
        </TimeZoneProvider>
      </body>
    </html>
  );
}
