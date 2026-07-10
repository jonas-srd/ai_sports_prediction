import type { Metadata } from "next";
import { type ReactNode } from "react";
import { CookieConsent } from "@/components/cookie-consent";
import { HtmlLangSync } from "@/components/html-lang-sync";
import { LocaleProvider } from "@/components/locale-provider";
import { SiteFooter } from "@/components/site-footer";
import { SiteNav } from "@/components/site-nav";
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
  const showFullSite =
    process.env.SHOW_FULL_SITE === "1" ||
    (process.env.SHOW_FULL_SITE !== "0" &&
      process.env.NODE_ENV !== "production" &&
      process.env.NEXT_PUBLIC_SHOW_FULL_SITE !== "0");
  const googleAnalyticsMeasurementId = process.env.NEXT_PUBLIC_GOOGLE_ANALYTICS_ID ?? "G-YVTSCGG16P";

  return (
    <html data-scroll-behavior="smooth" lang="en">
      <body>
        <LocaleProvider>
          <TimeZoneProvider>
            <HtmlLangSync />
            {showFullSite ? (
              <>
                <SiteNav />
                {children}
                <SiteFooter />
              </>
            ) : (
              children
            )}
            <CookieConsent measurementId={googleAnalyticsMeasurementId} />
          </TimeZoneProvider>
        </LocaleProvider>
      </body>
    </html>
  );
}
