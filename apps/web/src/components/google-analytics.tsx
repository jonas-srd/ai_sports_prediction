"use client";

import Script from "next/script";

const GA_MEASUREMENT_ID_PATTERN = /^G-[A-Z0-9]+$/i;

type GoogleAnalyticsProps = {
  measurementId?: string;
};

declare global {
  interface Window {
    dataLayer?: unknown[];
    gtag?: (...args: unknown[]) => void;
  }
}

export function GoogleAnalytics({ measurementId }: GoogleAnalyticsProps) {
  const id = measurementId?.trim();

  if (!id || !GA_MEASUREMENT_ID_PATTERN.test(id)) {
    return null;
  }

  return (
    <>
      <Script src={`https://www.googletagmanager.com/gtag/js?id=${encodeURIComponent(id)}`} strategy="afterInteractive" />
      <Script
        id="google-analytics"
        strategy="afterInteractive"
        dangerouslySetInnerHTML={{
          __html: `
          window.dataLayer = window.dataLayer || [];
          window.gtag = window.gtag || function(){window.dataLayer.push(arguments);};
          window.gtag('js', new Date());
          window.gtag('config', '${id}');
        `
        }}
      />
    </>
  );
}
