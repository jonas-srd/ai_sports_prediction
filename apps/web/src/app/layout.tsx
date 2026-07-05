import type { Metadata } from "next";
import { Suspense, type ReactNode } from "react";
import { GoogleAnalytics } from "@/components/google-analytics";
import { GoogleAnalyticsPageViews } from "@/components/google-analytics-page-views";
import { HtmlLangSync } from "@/components/html-lang-sync";
import { LocaleProvider } from "@/components/locale-provider";
import { SiteFooter } from "@/components/site-footer";
import { SiteNav } from "@/components/site-nav";
import { TimeZoneProvider } from "@/components/time-zone-provider";
import "./globals.css";
import "./sportschau-nav.css";

export const metadata: Metadata = {
  title: "AI Sport Prediction",
  description: "AI predictions, match signals and model analytics for football, NFL, NBA and tennis.",
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
  const showFullSite = process.env.NEXT_PUBLIC_SHOW_FULL_SITE === "1";
  const googleAnalyticsMeasurementId = process.env.NEXT_PUBLIC_GOOGLE_ANALYTICS_ID ?? "G-YVTSCGG16P";

  return (
    <html lang="en">
      <head>
        <GoogleAnalytics measurementId={googleAnalyticsMeasurementId} />
      </head>
      <body>
        <Suspense fallback={null}>
          <GoogleAnalyticsPageViews measurementId={googleAnalyticsMeasurementId} />
        </Suspense>
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
          </TimeZoneProvider>
        </LocaleProvider>
      </body>
    </html>
  );
}
