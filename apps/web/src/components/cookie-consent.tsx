"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Suspense, useEffect, useState } from "react";
import { GoogleAnalytics } from "@/components/google-analytics";
import { GoogleAnalyticsPageViews } from "@/components/google-analytics-page-views";
import { useLocale } from "@/components/locale-provider";
import { localizePath, stripLocalePrefix } from "@/lib/i18n";

const CONSENT_COOKIE = "ai_sp_cookie_consent";
const CONSENT_MAX_AGE_SECONDS = 60 * 60 * 24 * 180;

type ConsentValue = "analytics" | "necessary";

type CookieConsentProps = {
  measurementId: string;
};

export function CookieConsent({ measurementId }: CookieConsentProps) {
  const { locale } = useLocale();
  const pathname = stripLocalePrefix(usePathname() ?? "/");
  const [consent, setConsent] = useState<ConsentValue | null>(null);
  const [isReady, setIsReady] = useState(false);
  const [showPreferences, setShowPreferences] = useState(false);
  const copy = locale === "de"
    ? {
        accept: "Alle akzeptieren",
        body: "Wir verwenden Cookies, um diese Website bereitzustellen. Mit deiner Zustimmung nutzen wir außerdem Analytics-Cookies, um zu verstehen, wie AI Sports Prediction genutzt wird.",
        manage: "Auswahl anpassen",
        policy: "Cookie-Einstellungen",
        reject: "Alle ablehnen",
        title: "Cookies"
      }
    : {
        accept: "Accept all",
        body: "We use cookies to provide this website. With your consent, we also use analytics cookies to understand how AI Sports Prediction is used.",
        manage: "Manage choices",
        policy: "Cookie settings",
        reject: "Reject all",
        title: "Cookies"
      };
  const shouldShowBanner = isReady && consent === null && pathname !== "/cookies";

  useEffect(() => {
    setConsent(readConsentCookie());
    setIsReady(true);
  }, []);

  const saveConsent = (value: ConsentValue) => {
    writeConsentCookie(value);
    if (value === "necessary") {
      clearAnalyticsCookies();
    }
    setConsent(value);
  };

  return (
    <>
      <GoogleAnalytics measurementId={measurementId} consent={consent === "analytics" ? "granted" : "denied"} />
      {consent === "analytics" ? (
        <Suspense fallback={null}>
          <GoogleAnalyticsPageViews measurementId={measurementId} />
        </Suspense>
      ) : null}
      {shouldShowBanner ? (
        <section className="cookieConsent" aria-labelledby="cookie-consent-title">
          {showPreferences ? (
            <CookiePreferencePanel
              context="banner"
              initialConsent={consent}
              onSave={saveConsent}
            />
          ) : (
            <>
              <div>
                <h2 id="cookie-consent-title">{copy.title}</h2>
                <p>{copy.body}</p>
                <Link className="cookieConsentPolicyLink" href={localizePath("/cookies", locale)}>
                  {copy.policy}
                </Link>
              </div>
              <div className="cookieConsentActions">
                <button className="cookieConsentSecondary" onClick={() => saveConsent("necessary")} type="button">
                  {copy.reject}
                </button>
                <button className="cookieConsentSecondary" onClick={() => setShowPreferences(true)} type="button">
                  {copy.manage}
                </button>
                <button className="cookieConsentPrimary" onClick={() => saveConsent("analytics")} type="button">
                  {copy.accept}
                </button>
              </div>
            </>
          )}
        </section>
      ) : null}
    </>
  );
}

export function CookiePreferencesPage() {
  const { locale } = useLocale();
  const [consent, setConsent] = useState<ConsentValue | null>(null);
  const [isReady, setIsReady] = useState(false);
  const copy = locale === "de"
    ? {
        body: "Hier kannst du deine Cookie-Auswahl jederzeit ändern. Notwendige Cookies bleiben aktiv, weil die Website sie für Grundfunktionen benötigt.",
        title: "Cookie-Einstellungen"
      }
    : {
        body: "You can change your cookie choices here at any time. Necessary cookies stay active because the website needs them for core functions.",
        title: "Cookie settings"
      };

  useEffect(() => {
    setConsent(readConsentCookie());
    setIsReady(true);
  }, []);

  const saveConsent = (value: ConsentValue) => {
    writeConsentCookie(value);
    if (value === "necessary") {
      clearAnalyticsCookies();
    }
    setConsent(value);
  };

  if (!isReady) {
    return null;
  }

  return (
    <main className="cookieSettingsPage">
      <section className="cookieSettingsPanel">
        <p className="footballEyebrow">{copy.title}</p>
        <h1>{copy.title}</h1>
        <p>{copy.body}</p>
        <CookiePreferencePanel context="page" initialConsent={consent} onSave={saveConsent} />
      </section>
    </main>
  );
}

function CookiePreferencePanel({
  context,
  initialConsent,
  onSave
}: {
  context: "banner" | "page";
  initialConsent: ConsentValue | null;
  onSave: (value: ConsentValue) => void;
}) {
  const { locale } = useLocale();
  const [analyticsEnabled, setAnalyticsEnabled] = useState(initialConsent === "analytics");
  const copy = locale === "de"
    ? {
        analytics: "Analytics-Cookies",
        analyticsDescription: "Hilft uns zu verstehen, welche Seiten genutzt werden und wie wir die Website verbessern können.",
        necessary: "Notwendige Cookies",
        necessaryDescription: "Erforderlich für Grundfunktionen wie deine Cookie-Auswahl. Diese Cookies können nicht deaktiviert werden.",
        save: "Auswahl speichern",
        statusOff: "Aus",
        statusOn: "Ein"
      }
    : {
        analytics: "Analytics cookies",
        analyticsDescription: "Helps us understand which pages are used and how we can improve the website.",
        necessary: "Necessary cookies",
        necessaryDescription: "Required for core functions such as storing your cookie choice. These cookies cannot be disabled.",
        save: "Save choices",
        statusOff: "Off",
        statusOn: "On"
      };

  useEffect(() => {
    setAnalyticsEnabled(initialConsent === "analytics");
  }, [initialConsent]);

  return (
    <div className={context === "banner" ? "cookiePreferencePanel isBanner" : "cookiePreferencePanel"}>
      <div className="cookiePreferenceRow">
        <div>
          <strong>{copy.necessary}</strong>
          <p>{copy.necessaryDescription}</p>
        </div>
        <span>{copy.statusOn}</span>
      </div>
      <label className="cookiePreferenceRow cookiePreferenceToggle">
        <div>
          <strong>{copy.analytics}</strong>
          <p>{copy.analyticsDescription}</p>
        </div>
        <input
          checked={analyticsEnabled}
          onChange={(event) => setAnalyticsEnabled(event.target.checked)}
          type="checkbox"
        />
        <span>{analyticsEnabled ? copy.statusOn : copy.statusOff}</span>
      </label>
      <button className="cookieConsentPrimary" onClick={() => onSave(analyticsEnabled ? "analytics" : "necessary")} type="button">
        {copy.save}
      </button>
    </div>
  );
}

function readConsentCookie(): ConsentValue | null {
  const cookie = document.cookie
    .split("; ")
    .find((entry) => entry.startsWith(`${CONSENT_COOKIE}=`))
    ?.split("=")[1];

  return cookie === "analytics" || cookie === "necessary" ? cookie : null;
}

function writeConsentCookie(value: ConsentValue) {
  const secure = window.location.protocol === "https:" ? "; Secure" : "";
  document.cookie = `${CONSENT_COOKIE}=${value}; Max-Age=${CONSENT_MAX_AGE_SECONDS}; Path=/; SameSite=Lax${secure}`;
}

function clearAnalyticsCookies() {
  const analyticsCookieNames = document.cookie
    .split("; ")
    .map((entry) => entry.split("=")[0])
    .filter((name) => name === "_ga" || name === "_gid" || name === "_gat" || name.startsWith("_ga_"));

  analyticsCookieNames.forEach((name) => {
    document.cookie = `${name}=; Max-Age=0; Path=/; SameSite=Lax`;
  });
}
