"use client";

import { useEffect, useMemo, useState } from "react";
import styles from "./widget-customer-admin.module.css";

type Domain = { domain: string; id: string; is_primary: boolean };
type Invoice = {
  amount_due: number | null;
  amount_paid: number | null;
  created_at_utc: string;
  currency: string | null;
  hosted_invoice_url: string | null;
  invoice_number: string | null;
  invoice_pdf_url: string | null;
  status: string;
  stripe_invoice_id: string;
};
type Customer = {
  apiKeyEnabled: boolean;
  apiKeyPreview: string;
  apiKeyRevealable: boolean;
  billingEmail: string | null;
  billingInterval: string | null;
  cancelAtPeriodEnd: boolean;
  cancellationRequestedAt: string | null;
  cancellationEffectiveAt: string | null;
  currentPeriodEndsAt: string | null;
  domainLimit: number;
  domains: Domain[];
  email: string;
  id: string;
  invoices: Invoice[];
  legalCompanyName: string | null;
  minimumTermEndsAt: string | null;
  monthlyLimit: number;
  plan: "starter" | "growth" | "enterprise";
  publicationName: string;
  status: string;
  stripeConfigured: boolean;
  usage: { daily: Array<{ count: number; date: string }>; lastRequestAt: string | null; monthCount: number };
};
type ResponseData = {
  customers: Customer[];
  summary: { active: number; canceling: number; monthlyRequests: number; pastDue: number; total: number };
};

export function WidgetCustomerAdmin() {
  const [data, setData] = useState<ResponseData | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState("Kundendaten werden geladen …");
  const [busy, setBusy] = useState(false);
  const [visibleKey, setVisibleKey] = useState<string | null>(null);
  const [newDomain, setNewDomain] = useState("");
  const [limitValue, setLimitValue] = useState("");

  useEffect(() => { void load(); }, []);
  const customers = useMemo(() => (data?.customers ?? []).filter((customer) =>
    `${customer.publicationName} ${customer.email} ${customer.legalCompanyName ?? ""} ${customer.domains.map((domain) => domain.domain).join(" ")}`
      .toLowerCase().includes(query.toLowerCase())
  ), [data, query]);
  const selected = data?.customers.find((customer) => customer.id === selectedId) ?? customers[0] ?? null;

  async function load() {
    setBusy(true);
    try {
      const response = await fetch("/api/admin/widget-customers", { cache: "no-store" });
      if (response.status === 401) {
        window.location.assign("/admin/login?next=/admin/customers");
        return;
      }
      const body = await response.json();
      if (!response.ok) throw new Error("Kundenverwaltung ist noch nicht verfügbar.");
      setData(body);
      setSelectedId((current) => current ?? body.customers[0]?.id ?? null);
      setStatus(body.customers.length ? `${body.customers.length} Kunden geladen.` : "Noch keine Widget-Kunden vorhanden.");
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "Kundendaten konnten nicht geladen werden.");
    } finally {
      setBusy(false);
    }
  }

  async function act(action: string, extra: Record<string, unknown> = {}) {
    if (!selected) return;
    setBusy(true);
    setVisibleKey(null);
    try {
      const response = await fetch("/api/admin/widget-customers", {
        body: JSON.stringify({ action, customerId: selected.id, ...extra }),
        headers: { "content-type": "application/json" },
        method: "POST"
      });
      const body = await response.json();
      if (!response.ok) throw new Error(actionError(body.error));
      if (body.apiKey) {
        setVisibleKey(body.apiKey);
        await navigator.clipboard?.writeText(body.apiKey).catch(() => undefined);
        setStatus("API-Key angezeigt und in die Zwischenablage kopiert.");
      } else {
        setStatus("Änderung gespeichert.");
        await load();
      }
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "Änderung fehlgeschlagen.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className={styles.page}>
      <header className={styles.hero}>
        <div><span>Revenue Operations</span><h1>Widget-Kunden</h1><p>Kunden, Zugänge, Domains, Nutzung, Verträge und Rechnungen in einem geschützten Cockpit.</p></div>
        <button disabled={busy} onClick={() => void load()} type="button">{busy ? "Wird aktualisiert …" : "Aktualisieren"}</button>
      </header>
      <p className={styles.status} role="status">{status}</p>

      {data ? <section className={styles.metrics}>
        <Metric label="Kunden" value={data.summary.total} />
        <Metric label="Aktiv" value={data.summary.active} />
        <Metric label="Aufrufe im Monat" value={data.summary.monthlyRequests} />
        <Metric label="Zahlung/Kündigung prüfen" value={data.summary.pastDue + data.summary.canceling} />
      </section> : null}

      <section className={styles.workspace}>
        <aside className={styles.list}>
          <input aria-label="Kunden suchen" onChange={(event) => setQuery(event.target.value)} placeholder="Kunde, E-Mail oder Domain suchen" value={query} />
          {customers.map((customer) => (
            <button className={selected?.id === customer.id ? styles.selected : undefined} key={customer.id} onClick={() => {
              setSelectedId(customer.id);
              setVisibleKey(null);
              setLimitValue("");
            }} type="button">
              <span><b>{customer.publicationName}</b><em className={styles[statusTone(customer.status)]}>{customer.status}</em></span>
              <small>{customer.plan.toUpperCase()} · {customer.usage.monthCount.toLocaleString("de-DE")} / {customer.monthlyLimit.toLocaleString("de-DE")}</small>
            </button>
          ))}
        </aside>

        {selected ? <div className={styles.detail}>
          <section className={styles.title}>
            <div><span>{selected.plan} · {selected.billingInterval ?? "individuell"}</span><h2>{selected.publicationName}</h2><p>{selected.legalCompanyName || selected.email} · {selected.billingEmail || selected.email}</p></div>
            <div className={styles.badges}><b className={styles[statusTone(selected.status)]}>{selected.status}</b><b>{selected.apiKeyEnabled ? "Key aktiv" : "Key gesperrt"}</b></div>
          </section>

          <div className={styles.columns}>
            <section className={styles.panel}>
              <h3>API-Key</h3>
              <code>{visibleKey || selected.apiKeyPreview}</code>
              <p>{selected.apiKeyRevealable ? "Der Schlüssel ist verschlüsselt gespeichert." : "Bestehender Hash: zum Anzeigen einmal erneuern."}</p>
              <div className={styles.actions}>
                <button disabled={busy || !selected.apiKeyRevealable} onClick={() => void act("reveal_key")} type="button">Anzeigen</button>
                <button disabled={busy} onClick={() => confirm("Der bisherige Key funktioniert danach sofort nicht mehr. Wirklich erneuern?") && void act("rotate_key")} type="button">Erneuern</button>
                <button className={selected.apiKeyEnabled ? styles.danger : undefined} disabled={busy} onClick={() => void act("set_key_enabled", { enabled: !selected.apiKeyEnabled })} type="button">{selected.apiKeyEnabled ? "Sperren" : "Freigeben"}</button>
              </div>
            </section>

            <section className={styles.panel}>
              <h3>Nutzung & Tariflimit</h3>
              <strong>{selected.usage.monthCount.toLocaleString("de-DE")} <small>von {selected.monthlyLimit.toLocaleString("de-DE")}</small></strong>
              <div className={styles.progress}><i style={{ width: `${Math.min(selected.usage.monthCount / selected.monthlyLimit * 100, 100)}%` }} /></div>
              <p>Letzter Aufruf: {formatDateTime(selected.usage.lastRequestAt)}</p>
              <form onSubmit={(event) => { event.preventDefault(); void act("set_monthly_limit", { monthlyLimit: Number(limitValue) }); }}>
                <input min="1" onChange={(event) => setLimitValue(event.target.value)} placeholder={String(selected.monthlyLimit)} type="number" value={limitValue} />
                <button disabled={busy || !limitValue} type="submit">Limit speichern</button>
              </form>
            </section>
          </div>

          <section className={styles.panel}>
            <div className={styles.panelHeading}><div><h3>Erlaubte Domains</h3><p>{selected.domains.length} von {selected.domainLimit} Domains</p></div></div>
            <div className={styles.domains}>{selected.domains.map((domain) => <div key={domain.id}><span>{domain.domain}{domain.is_primary ? " · Primär" : ""}</span><button disabled={busy || selected.domains.length <= 1} onClick={() => void act("remove_domain", { domainId: domain.id })} type="button">Entfernen</button></div>)}</div>
            <form onSubmit={(event) => { event.preventDefault(); void act("add_domain", { domain: newDomain }); setNewDomain(""); }}>
              <input onChange={(event) => setNewDomain(event.target.value)} placeholder="news.example.com" value={newDomain} />
              <button disabled={busy || !newDomain || selected.domains.length >= selected.domainLimit} type="submit">Domain hinzufügen</button>
            </form>
          </section>

          <div className={styles.columns}>
            <section className={styles.panel}>
              <h3>Vertrag & Kündigung</h3>
              <dl>
                <div><dt>Mindestlaufzeit</dt><dd>{formatDate(selected.minimumTermEndsAt)}</dd></div>
                <div><dt>Aktuelle Periode</dt><dd>{formatDate(selected.currentPeriodEndsAt)}</dd></div>
                <div><dt>Vertragsstatus</dt><dd>{selected.cancelAtPeriodEnd ? "Kündigung vorgemerkt" : "Automatische Verlängerung"}</dd></div>
                <div><dt>Kündigung wirksam</dt><dd>{formatDate(selected.cancellationEffectiveAt)}</dd></div>
              </dl>
              <button className={selected.cancelAtPeriodEnd ? undefined : styles.danger} disabled={busy || !selected.stripeConfigured} onClick={() => void act(selected.cancelAtPeriodEnd ? "resume_subscription" : "cancel_subscription")} type="button">
                {selected.cancelAtPeriodEnd ? "Kündigung zurücknehmen" : "Zum zulässigen Termin kündigen"}
              </button>
            </section>
            <section className={styles.panel}>
              <h3>Rechnungen</h3>
              {selected.invoices.length ? <div className={styles.invoices}>{selected.invoices.map((invoice) => <div key={invoice.stripe_invoice_id}><span><b>{invoice.invoice_number || "Rechnung"}</b><small>{formatMoney(invoice.amount_paid ?? invoice.amount_due, invoice.currency)} · {invoice.status}</small></span><span>{invoice.hosted_invoice_url ? <a href={invoice.hosted_invoice_url} rel="noreferrer" target="_blank">Öffnen</a> : null}{invoice.invoice_pdf_url ? <a href={invoice.invoice_pdf_url} rel="noreferrer" target="_blank">PDF</a> : null}</span></div>)}</div> : <p>Noch keine über Stripe synchronisierte Rechnung.</p>}
            </section>
          </div>
        </div> : <div className={styles.empty}>Noch keine Kunden vorhanden.</div>}
      </section>
    </main>
  );
}

function Metric({ label, value }: { label: string; value: number }) {
  return <article><span>{label}</span><strong>{value.toLocaleString("de-DE")}</strong></article>;
}
function statusTone(status: string) { return status === "active" ? "good" : status === "past_due" ? "warning" : "muted"; }
function formatDate(value: string | null) { return value ? new Intl.DateTimeFormat("de-DE", { dateStyle: "medium" }).format(new Date(value)) : "–"; }
function formatDateTime(value: string | null) { return value ? new Intl.DateTimeFormat("de-DE", { dateStyle: "short", timeStyle: "short" }).format(new Date(value)) : "noch keiner"; }
function formatMoney(value: number | null, currency: string | null) { return value === null ? "–" : new Intl.NumberFormat("de-DE", { currency: currency || "EUR", style: "currency" }).format(value / 100); }
function actionError(code: string) {
  return ({
    at_least_one_domain_required: "Mindestens eine Domain muss erhalten bleiben.",
    domain_limit_reached: "Das Domainlimit dieses Tarifs ist erreicht.",
    key_not_revealable: "Diesen alten Schlüssel bitte einmal erneuern.",
    stripe_subscription_missing: "Keine Stripe-Subscription hinterlegt."
  } as Record<string, string>)[code] || "Änderung konnte nicht gespeichert werden.";
}
