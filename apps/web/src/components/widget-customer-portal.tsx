"use client";

import { useCallback, useEffect, useState } from "react";
import type { Locale } from "@/lib/i18n";
import styles from "./widget-customer-portal.module.css";

type Account = {
  apiKey: string | null;
  apiKeyPreview: string | null;
  billingEmail: string | null;
  cancelAtPeriodEnd: boolean;
  cancellationEffectiveAt: string | null;
  domainLimit: number;
  domains: Array<{ domain: string; id: string; is_primary: boolean }>;
  invoices: Array<{
    amount_due: number | null;
    amount_paid: number | null;
    currency: string | null;
    hosted_invoice_url: string | null;
    invoice_number: string | null;
    invoice_pdf_url: string | null;
    status: string;
    stripe_invoice_id: string;
  }>;
  legalCompanyName: string | null;
  monthlyLimit: number;
  plan: string;
  publicationName: string;
  status: string;
  usagePercent: number;
  usedRequests: number;
};

export function WidgetCustomerPortal({ locale }: { locale: Locale }) {
  const german = locale === "de";
  const [account, setAccount] = useState<Account | null>(null);
  const [error, setError] = useState("");
  const [domain, setDomain] = useState("");
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    const response = await fetch("/api/widgets/account", { cache: "no-store" });
    if (response.status === 401) {
      window.location.href = german ? "/de/widgets/account/login" : "/widgets/account/login";
      return;
    }
    const payload = await response.json();
    if (!response.ok) throw new Error(payload.error || "account_unavailable");
    setAccount(payload.account);
  }, [german]);

  useEffect(() => { void load().catch(() => setError(german ? "Kundenkonto nicht erreichbar." : "Customer account unavailable.")); }, [load, german]);

  async function act(action: string, extra: Record<string, unknown> = {}) {
    setBusy(true);
    setError("");
    try {
      const response = await fetch("/api/widgets/account", {
        body: JSON.stringify({ action, locale, ...extra }),
        headers: { "content-type": "application/json" },
        method: "POST"
      });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error);
      if (payload.url) {
        window.location.href = payload.url;
        return;
      }
      await load();
    } catch (caught) {
      setError(messageFor(caught instanceof Error ? caught.message : "", german));
    } finally {
      setBusy(false);
    }
  }

  async function logout() {
    await fetch("/api/widgets/account/auth/logout", { method: "POST" });
    window.location.href = german ? "/de/widgets/account/login" : "/widgets/account/login";
  }

  if (!account) return <main className={styles.portalPage}><p>{error || (german ? "Konto wird geladen…" : "Loading account…")}</p></main>;
  const money = (value: number | null, currency: string | null) => new Intl.NumberFormat(
    german ? "de-DE" : "en-GB",
    { currency: (currency || "EUR").toUpperCase(), style: "currency" }
  ).format((value ?? 0) / 100);

  return (
    <main className={styles.portalPage}>
      <header className={styles.portalHeader}>
        <div><span>{german ? "Widget-Kundenkonto" : "Widget customer account"}</span><h1>{account.publicationName}</h1><p>{account.legalCompanyName} · {account.plan.toUpperCase()} · {account.status}</p></div>
        <button className={styles.secondary} onClick={logout} type="button">{german ? "Abmelden" : "Sign out"}</button>
      </header>
      {error ? <div className={styles.error}>{error}</div> : null}
      <section className={styles.portalGrid}>
        <article className={styles.panel}>
          <span>{german ? "Nutzung im laufenden Monat" : "Usage this month"}</span>
          <h2>{account.usedRequests.toLocaleString(german ? "de-DE" : "en-GB")} <small>/ {account.monthlyLimit.toLocaleString(german ? "de-DE" : "en-GB")}</small></h2>
          <div className={styles.progress}><i style={{ width: `${account.usagePercent}%` }} /></div>
          <p>{account.usagePercent}% · {german ? "Widget-Aufrufe" : "widget requests"}</p>
        </article>
        <article className={styles.panel}>
          <span>API-Key</span>
          <h2>{account.apiKeyPreview || "—"}</h2>
          {account.apiKey ? <code>{account.apiKey}</code> : <p>{german ? "Dieser ältere Schlüssel kann nur erneuert werden." : "This legacy key can only be rotated."}</p>}
          <button disabled={busy} onClick={() => {
            if (window.confirm(german ? "Der bisherige API-Key funktioniert danach sofort nicht mehr. Fortfahren?" : "The previous API key will stop working immediately. Continue?")) void act("rotate_key");
          }} type="button">{german ? "API-Key erneuern" : "Rotate API key"}</button>
        </article>
        <article className={`${styles.panel} ${styles.wide}`}>
          <span>{german ? "Erlaubte Domains" : "Allowed domains"}</span>
          <h2>{account.domains.length} / {account.domainLimit}</h2>
          <div className={styles.domainList}>{account.domains.map((entry) => (
            <div key={entry.id}><b>{entry.domain}</b><span>{entry.is_primary ? (german ? "Primär" : "Primary") : <button disabled={busy} onClick={() => void act("remove_domain", { domainId: entry.id })} type="button">{german ? "Entfernen" : "Remove"}</button>}</span></div>
          ))}</div>
          <form onSubmit={(event) => { event.preventDefault(); void act("add_domain", { domain }).then(() => setDomain("")); }}>
            <input onChange={(event) => setDomain(event.target.value)} placeholder="sports.example.com" required value={domain} />
            <button disabled={busy || account.domains.length >= account.domainLimit} type="submit">{german ? "Domain hinzufügen" : "Add domain"}</button>
          </form>
        </article>
        <article className={`${styles.panel} ${styles.wide}`}>
          <span>{german ? "Rechnungen und Zahlungsdaten" : "Invoices and billing"}</span>
          <h2>{account.billingEmail}</h2>
          <p>{german
            ? "Zahlungsmethode, Rechnungsanschrift und USt-ID werden sicher im Stripe-Kundenportal aktualisiert. Vertragskündigungen erfolgen ausschließlich hier im Kundenkonto."
            : "Payment method, billing address and VAT ID are updated securely in Stripe. Contract cancellation is handled only in this customer account."}</p>
          <button disabled={busy} onClick={() => void act("billing_portal")} type="button">{german ? "Zahlungs- und Rechnungsdaten verwalten" : "Manage billing details"}</button>
          <div className={styles.invoiceList}>{account.invoices.map((invoice) => (
            <div key={invoice.stripe_invoice_id}>
              <span><b>{invoice.invoice_number || (german ? "Rechnung" : "Invoice")}</b><small>{money(invoice.amount_paid ?? invoice.amount_due, invoice.currency)} · {invoice.status}</small></span>
              <span>{invoice.hosted_invoice_url ? <a href={invoice.hosted_invoice_url} rel="noreferrer" target="_blank">{german ? "Öffnen" : "Open"}</a> : null}{invoice.invoice_pdf_url ? <a href={invoice.invoice_pdf_url} rel="noreferrer" target="_blank">PDF</a> : null}</span>
            </div>
          ))}</div>
        </article>
        <article className={`${styles.panel} ${styles.wide}`}>
          <span>{german ? "Vertragsstatus" : "Contract status"}</span>
          <h2>{account.cancelAtPeriodEnd
            ? `${german ? "Beendet zum" : "Ends on"} ${formatDate(account.cancellationEffectiveAt, german)}`
            : (german ? "Aktiv – automatische Verlängerung" : "Active – automatic renewal")}</h2>
          <p>{german
            ? "Eine Kündigung wird zum frühesten vertraglich zulässigen Termin vorgemerkt. Bis dahin bleibt der Zugang aktiv."
            : "Cancellation is scheduled for the earliest date permitted by the contract. Access remains active until then."}</p>
          <button className={account.cancelAtPeriodEnd ? undefined : styles.danger} disabled={busy} onClick={() => {
            const question = account.cancelAtPeriodEnd
              ? (german ? "Kündigung wirklich zurücknehmen?" : "Withdraw the cancellation?")
              : (german ? "Kündigung zum frühesten zulässigen Termin verbindlich vormerken?" : "Schedule cancellation for the earliest permitted date?");
            if (window.confirm(question)) void act(account.cancelAtPeriodEnd ? "resume_subscription" : "cancel_subscription");
          }} type="button">{account.cancelAtPeriodEnd ? (german ? "Kündigung zurücknehmen" : "Withdraw cancellation") : (german ? "Vertrag kündigen" : "Cancel contract")}</button>
        </article>
      </section>
    </main>
  );
}

function formatDate(value: string | null, german: boolean) {
  return value ? new Intl.DateTimeFormat(german ? "de-DE" : "en-GB", { dateStyle: "long" }).format(new Date(value)) : "—";
}

function messageFor(code: string, german: boolean) {
  const messages: Record<string, [string, string]> = {
    domain_limit_reached: ["Domainlimit erreicht.", "Domain limit reached."],
    at_least_one_domain_required: ["Mindestens eine Domain muss bestehen bleiben.", "At least one domain must remain."],
    account_action_failed: ["Aktion konnte nicht abgeschlossen werden.", "The action could not be completed."]
  };
  return (messages[code] ?? ["Aktion fehlgeschlagen.", "Action failed."])[german ? 0 : 1];
}
