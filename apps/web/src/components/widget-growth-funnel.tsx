"use client";

import { useRef, useState, type FormEvent } from "react";
import { trackGrowthEvent } from "@/lib/growth-analytics";
import type { Locale } from "@/lib/i18n";

type Plan = {
  description: string;
  features: string[];
  name: string;
  plan: "starter" | "growth" | "enterprise";
  price: string;
};

const copy = {
  en: {
    buttons: { starter: "Request Starter access", growth: "Request Growth access", enterprise: "Contact sales" },
    consent: "I agree that AI Sports Prediction may process this paid-access request and contact me about the widgets.",
    email: "Work email",
    error: "The request could not be completed. Please try again later.",
    formIntro: "Send us your publisher details. Access is activated only after the paid plan has been confirmed.",
    formTitle: "Request paid publisher access",
    publication: "Publication / company",
    submit: "Send access request",
    success: "Thanks — your request is saved. We will contact you about activation and payment.",
    website: "Website domain"
  },
  de: {
    buttons: { starter: "Starter-Zugang anfragen", growth: "Growth-Zugang anfragen", enterprise: "Vertrieb kontaktieren" },
    consent: "Ich stimme zu, dass AI Sports Prediction diese Anfrage für einen kostenpflichtigen Zugang verarbeitet und mich zu den Widgets kontaktiert.",
    email: "Geschäftliche E-Mail",
    error: "Die Anfrage konnte nicht abgeschlossen werden. Bitte versuche es später erneut.",
    formIntro: "Sende uns deine Publisher-Daten. Der Zugang wird erst nach Bestätigung des kostenpflichtigen Tarifs aktiviert.",
    formTitle: "Kostenpflichtigen Publisher-Zugang anfragen",
    publication: "Redaktion / Unternehmen",
    submit: "Zugang anfragen",
    success: "Danke – deine Anfrage wurde gespeichert. Wir melden uns zur Freischaltung und Zahlung.",
    website: "Website-Domain"
  }
};

export function WidgetGrowthFunnel({ locale, plans }: { locale: Locale; plans: Plan[] }) {
  const text = copy[locale];
  const formRef = useRef<HTMLDivElement>(null);
  const [selectedPlan, setSelectedPlan] = useState<Plan["plan"]>("starter");
  const [status, setStatus] = useState<"idle" | "submitting" | "success" | "error">("idle");
  const [message, setMessage] = useState("");

  function choosePlan(plan: Plan["plan"]) {
    setSelectedPlan(plan);
    setStatus("idle");
    setMessage("");
    trackGrowthEvent("pricing_cta_click", { plan });
    window.setTimeout(() => formRef.current?.scrollIntoView({ behavior: "smooth", block: "center" }), 0);
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    setStatus("submitting");
    setMessage("");

    try {
      const response = await fetch("/api/widgets/access-request", {
        body: JSON.stringify({
          company: data.get("company"),
          consent: data.get("consent") === "on",
          email: data.get("email"),
          locale,
          plan: selectedPlan,
          publicationName: data.get("publicationName"),
          websiteUrl: data.get("websiteUrl")
        }),
        headers: { "content-type": "application/json" },
        method: "POST"
      });
      const body = await response.json() as { ok?: boolean };
      if (!response.ok || !body.ok) throw new Error(text.error);

      trackGrowthEvent(selectedPlan === "enterprise" ? "widget_sales_request" : "widget_access_request", { plan: selectedPlan });
      setStatus("success");
      setMessage(text.success);
    } catch (error) {
      setStatus("error");
      setMessage(error instanceof Error ? error.message : text.error);
    }
  }

  return (
    <>
      <div className="widgetsPricingGrid">
        {plans.map((plan) => (
          <article className={plan.plan === selectedPlan ? "widgetsPricingCard isSelected" : "widgetsPricingCard"} key={plan.name}>
            <div>
              <span>{plan.plan}</span>
              <h3>{plan.name}</h3>
              <strong>{plan.price}</strong>
              <p>{plan.description}</p>
            </div>
            <ul>{plan.features.map((feature) => <li key={feature}>{feature}</li>)}</ul>
            <button className="widgetsPricingCta" onClick={() => choosePlan(plan.plan)} type="button">
              {text.buttons[plan.plan]}
            </button>
          </article>
        ))}
      </div>

      <div className="widgetLeadForm" ref={formRef}>
        <div>
          <p className="footballEyebrow">{selectedPlan}</p>
          <h3>{text.formTitle}</h3>
          <p>{text.formIntro}</p>
        </div>
        <form onSubmit={submit}>
          <input aria-hidden="true" autoComplete="off" className="widgetLeadHoneypot" name="company" tabIndex={-1} />
          <label><span>{text.publication}</span><input maxLength={120} name="publicationName" required /></label>
          <label><span>{text.website}</span><input inputMode="url" name="websiteUrl" placeholder="https://publisher.example" required /></label>
          <label><span>{text.email}</span><input autoComplete="email" name="email" required type="email" /></label>
          <label className="widgetLeadConsent"><input name="consent" required type="checkbox" /><span>{text.consent}</span></label>
          <button className="widgetsPricingCta" disabled={status === "submitting"} type="submit">{text.submit}</button>
        </form>
        {message ? <p className={`widgetLeadMessage is-${status}`} role="status">{message}</p> : null}
      </div>
    </>
  );
}
