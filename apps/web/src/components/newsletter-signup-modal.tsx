"use client";

import { type FormEvent, useEffect, useState } from "react";
import { useLocale } from "@/components/locale-provider";

const DISMISSED_UNTIL_KEY = "ai_sp_newsletter_dismissed_until";
const SUBSCRIBED_KEY = "ai_sp_newsletter_subscribed";
const DISMISS_MS = 1000 * 60 * 60 * 24 * 7;

type SubmitState = "idle" | "submitting" | "success" | "error";

export function NewsletterSignupModal() {
  const { locale } = useLocale();
  const [isVisible, setIsVisible] = useState(false);
  const [email, setEmail] = useState("");
  const [consent, setConsent] = useState(false);
  const [company, setCompany] = useState("");
  const [submitState, setSubmitState] = useState<SubmitState>("idle");

  const copy = locale === "de"
    ? {
        close: "Schließen",
        consent: "Ich möchte den Newsletter erhalten und stimme der Verarbeitung meiner E-Mail-Adresse dafür zu.",
        description: "Erhalte kompakte Modell-Signale, Matchday-Picks und neue Widget-Updates direkt in dein Postfach.",
        email: "E-Mail-Adresse",
        error: "Das hat gerade nicht geklappt. Bitte versuche es später nochmal.",
        kicker: "Newsletter",
        submit: "Eintragen",
        submitting: "Wird gespeichert",
        success: "Danke, du bist eingetragen.",
        title: "AI Sports Prediction Updates"
      }
    : {
        close: "Close",
        consent: "I want to receive the newsletter and agree that my email address is processed for that purpose.",
        description: "Get compact model signals, matchday picks and widget updates straight to your inbox.",
        email: "Email address",
        error: "That did not work right now. Please try again later.",
        kicker: "Newsletter",
        submit: "Subscribe",
        submitting: "Saving",
        success: "Thanks, you are subscribed.",
        title: "AI Sports Prediction updates"
      };

  useEffect(() => {
    const subscribed = window.localStorage.getItem(SUBSCRIBED_KEY) === "1";
    const dismissedUntil = Number(window.localStorage.getItem(DISMISSED_UNTIL_KEY) ?? 0);

    if (subscribed || dismissedUntil > Date.now()) {
      return;
    }

    const timer = window.setTimeout(() => setIsVisible(true), 900);
    return () => window.clearTimeout(timer);
  }, []);

  if (!isVisible) {
    return null;
  }

  const close = () => {
    window.localStorage.setItem(DISMISSED_UNTIL_KEY, String(Date.now() + DISMISS_MS));
    setIsVisible(false);
  };

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSubmitState("submitting");

    const response = await fetch("/api/newsletter/subscribe", {
      body: JSON.stringify({
        company,
        consent,
        consentText: copy.consent,
        email,
        locale,
        source: "newsletter-modal"
      }),
      headers: { "content-type": "application/json" },
      method: "POST"
    }).catch(() => null);

    if (!response?.ok) {
      setSubmitState("error");
      return;
    }

    window.localStorage.setItem(SUBSCRIBED_KEY, "1");
    setSubmitState("success");
    window.setTimeout(() => setIsVisible(false), 1500);
  };

  return (
    <div className="newsletterModalOverlay" role="presentation">
      <section className="newsletterModal" aria-labelledby="newsletter-modal-title" role="dialog" aria-modal="true">
        <button className="newsletterModalClose" type="button" onClick={close} aria-label={copy.close}>
          ×
        </button>
        <p className="newsletterModalKicker">{copy.kicker}</p>
        <h2 id="newsletter-modal-title">{copy.title}</h2>
        <p>{copy.description}</p>
        <form className="newsletterModalForm" onSubmit={submit}>
          <label>
            <span>{copy.email}</span>
            <input
              autoComplete="email"
              onChange={(event) => setEmail(event.target.value)}
              required
              type="email"
              value={email}
            />
          </label>
          <label className="newsletterModalConsent">
            <input
              checked={consent}
              onChange={(event) => setConsent(event.target.checked)}
              required
              type="checkbox"
            />
            <span>{copy.consent}</span>
          </label>
          <label className="newsletterModalHoneypot">
            Company
            <input autoComplete="off" tabIndex={-1} value={company} onChange={(event) => setCompany(event.target.value)} />
          </label>
          <button className="newsletterModalSubmit" disabled={submitState === "submitting"} type="submit">
            {submitState === "submitting" ? copy.submitting : copy.submit}
          </button>
        </form>
        {submitState === "success" ? <p className="newsletterModalStatus isSuccess">{copy.success}</p> : null}
        {submitState === "error" ? <p className="newsletterModalStatus isError">{copy.error}</p> : null}
      </section>
    </div>
  );
}
