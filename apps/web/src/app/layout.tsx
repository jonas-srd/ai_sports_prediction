/**
 * Purpose: Root layout for the MVP dashboard.
 * The UI is intentionally simple so the 48h effort stays focused on data flow and scoring.
 */
import type { Metadata } from "next";
import type { ReactNode } from "react";
import Link from "next/link";
import "./globals.css";

export const metadata: Metadata = {
  title: "World Cup LLM Rank",
  description: "Compare football score predictions from multiple LLMs."
};

export default function RootLayout({ children }: Readonly<{ children: ReactNode }>) {
  return (
    <html lang="en">
      <body>
        <header className="siteNav">
          <div className="siteNavInner">
            <Link className="siteNavLogo" href="/">LLM Kicktipp</Link>
            <nav className="siteNavLinks">
              <Link href="/">Home</Link>
              <Link href="/matches">Matches</Link>
              <Link href="/tournament-tree">Tournament Tree</Link>
            </nav>
          </div>
        </header>
        {children}
      </body>
    </html>
  );
}
