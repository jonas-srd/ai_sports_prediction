import type { Metadata } from "next";
import { type ReactNode } from "react";
import { CookieConsent } from "@/components/cookie-consent";
import { HtmlLangSync } from "@/components/html-lang-sync";
import { LocaleProvider } from "@/components/locale-provider";
import { SiteChrome } from "@/components/site-chrome";
import { TimeZoneProvider } from "@/components/time-zone-provider";
import "./globals.css";
import "./sportschau-nav.css";

export const metadata: Metadata = {
  metadataBase: new URL("https://www.ai-sports-prediction.net"),
  title: "AI Sports Prediction",
  description: "AI predictions, match signals and model analytics for football, NFL, NBA and tennis.",
  openGraph: {
    title: "AI Sports Prediction",
    description: "AI predictions, match signals and model analytics for football, NFL, NBA and tennis.",
    images: [{ url: "/site-icon.png", width: 1254, height: 1254, alt: "AI Sports Prediction" }]
  },
  twitter: {
    card: "summary",
    images: ["/site-icon.png"]
  },
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
  const googleAnalyticsMeasurementId = process.env.NEXT_PUBLIC_GOOGLE_ANALYTICS_ID ?? "G-KSGFX9TKD8";

  return (
    <html data-scroll-behavior="smooth" lang="en">
      <body>
        <LocaleProvider>
          <TimeZoneProvider>
            <HtmlLangSync />
            <SiteChrome>{children}</SiteChrome>
            <CookieConsent measurementId={googleAnalyticsMeasurementId} />
          </TimeZoneProvider>
        </LocaleProvider>
      </body>
    </html>
  );
}
