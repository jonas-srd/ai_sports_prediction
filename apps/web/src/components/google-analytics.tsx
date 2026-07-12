"use client";

import { useEffect } from "react";

const GA_MEASUREMENT_ID_PATTERN = /^G-[A-Z0-9]+$/i;

type GoogleAnalyticsProps = {
  consent: "denied" | "granted";
  measurementId?: string;
};

declare global {
  interface Window {
    __aiSportsGaInitialized?: string;
    dataLayer?: unknown[];
    gtag?: (...args: unknown[]) => void;
  }
}

export function GoogleAnalytics({ consent, measurementId }: GoogleAnalyticsProps) {
  const id = measurementId?.trim();

  useEffect(() => {
    if (!id || !GA_MEASUREMENT_ID_PATTERN.test(id)) {
      return;
    }

    window.dataLayer = window.dataLayer || [];
    window.gtag = window.gtag || function gtag() {
      window.dataLayer?.push(arguments);
    };

    if (!document.querySelector(`script[data-ai-sports-ga="${id}"]`)) {
      const script = document.createElement("script");
      script.async = true;
      script.dataset.aiSportsGa = id;
      script.src = `https://www.googletagmanager.com/gtag/js?id=${encodeURIComponent(id)}`;
      document.head.appendChild(script);
    }

    if (window.__aiSportsGaInitialized !== id) {
      window.gtag("consent", "default", {
        analytics_storage: consent,
        ad_storage: "denied",
        ad_user_data: "denied",
        ad_personalization: "denied",
        wait_for_update: 500
      });
      window.gtag("js", new Date());
      window.__aiSportsGaInitialized = id;
    }

    window.gtag("consent", "update", {
      analytics_storage: consent
    });

    if (consent === "granted") {
      window.gtag("config", id, {
        page_path: `${window.location.pathname}${window.location.search}`
      });
    }
  }, [consent, id]);

  return null;
}
