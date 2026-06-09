/**
 * Purpose: Root layout for the MVP dashboard.
 * The UI is intentionally simple so the 48h effort stays focused on data flow and scoring.
 */
import type { Metadata } from "next";
import type { ReactNode } from "react";
import "./globals.css";

export const metadata: Metadata = {
  title: "World Cup LLM Rank",
  description: "Compare football score predictions from multiple LLMs."
};

export default function RootLayout({ children }: Readonly<{ children: ReactNode }>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
