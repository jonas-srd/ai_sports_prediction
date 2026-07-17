"use client";

import { useCallback, useEffect, useMemo, useState, type FormEvent } from "react";
import styles from "./revenue-dashboard.module.css";

type Dashboard = {
  analytics: { configured: boolean; delivery: Record<string, number> };
  breakdown: Array<{ country: string; customers: number; purchases: number; revenueCents: number; source: string }>;
  costs: Array<{ amountCents: number; country: string; id: string; periodStart: string; source: string }>;
  funnel: { activations: number; checkouts: number; leads: number; purchases: number };
  overview: {
    activeCustomers: number; arrCents: number; atRiskCustomers: number; averageCustomerValueCents: number;
    cac90dCents: number | null; checkoutConversion30d: number; churn30d: number; enterpriseCustomers: number;
    mrrCents: number; paymentFailures30d: number; pendingCancellations: number; revenue30dCents: number;
    revenueTotalCents: number; starterToGrowthUpgrades: number;
  };
  trend: Array<{ month: string; purchases: number; revenueCents: number }>;
};

const euro = new Intl.NumberFormat("de-DE", { currency: "EUR", maximumFractionDigits: 0, style: "currency" });

export function RevenueDashboard() {
  const [data, setData] = useState<Dashboard | null>(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    setError("");
    const response = await fetch("/api/admin/revenue-dashboard", { cache: "no-store" });
    const payload = await response.json();
    if (!response.ok) throw new Error(payload.error);
    setData(payload);
  }, []);

  useEffect(() => { void load().catch(() => setError("Das Umsatz-Cockpit konnte nicht geladen werden.")); }, [load]);

  async function saveCost(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setError("");
    const form = new FormData(event.currentTarget);
    const response = await fetch("/api/admin/revenue-dashboard", {
      body: JSON.stringify({
        amountCents: Math.round(Number(form.get("amount")) * 100),
        country: form.get("country"),
        periodStart: form.get("periodStart"),
        source: form.get("source")
      }),
      headers: { "content-type": "application/json" },
      method: "POST"
    });
    setBusy(false);
    if (!response.ok) setError("Akquisekosten konnten nicht gespeichert werden.");
    else {
      event.currentTarget.reset();
      await load();
    }
  }

  const maxTrend = useMemo(() => Math.max(1, ...(data?.trend.map((item) => item.revenueCents) ?? [1])), [data]);

  return (
    <main className={styles.page}>
      <header className={styles.hero}>
        <div><span>Revenue Intelligence</span><h1>Umsatz-Cockpit</h1><p>Abos, Funnel, Herkunft, Risiken und Kundenwert – direkt aus Stripe-Webhooks und euren operativen Daten.</p></div>
        <button onClick={() => void load()} type="button">Aktualisieren</button>
      </header>
      {error ? <p className={styles.error}>{error}</p> : null}
      {!data ? <p className={styles.loading}>Kennzahlen werden geladen …</p> : <>
        <section className={styles.primaryMetrics} aria-label="Wichtigste Umsatzkennzahlen">
          <Metric label="MRR" value={money(data.overview.mrrCents)} note={`${data.overview.activeCustomers} aktive Kunden`} />
          <Metric label="ARR" value={money(data.overview.arrCents)} note="annualisierter Vertragswert" />
          <Metric label="Umsatz · 30 Tage" value={money(data.overview.revenue30dCents)} note={`${money(data.overview.revenueTotalCents)} insgesamt`} />
          <Metric label="Checkout-Conversion" value={`${formatPercent(data.overview.checkoutConversion30d)} %`} note="Checkout → bezahlte Rechnung" />
        </section>

        <section className={styles.twoColumns}>
          <article className={styles.panel}>
            <div className={styles.panelTitle}><div><span>Letzte 30 Tage</span><h2>Verkaufsfunnel</h2></div><b>{formatPercent(data.overview.checkoutConversion30d)} %</b></div>
            <div className={styles.funnel}>
              <FunnelStep label="Leads" value={data.funnel.leads} maximum={Math.max(data.funnel.leads, 1)} />
              <FunnelStep label="Checkouts" value={data.funnel.checkouts} maximum={Math.max(data.funnel.leads, 1)} />
              <FunnelStep label="Käufe" value={data.funnel.purchases} maximum={Math.max(data.funnel.leads, 1)} />
              <FunnelStep label="Aktiviert" value={data.funnel.activations} maximum={Math.max(data.funnel.leads, 1)} />
            </div>
          </article>
          <article className={styles.panel}>
            <div className={styles.panelTitle}><div><span>12 Monate</span><h2>Umsatzverlauf</h2></div></div>
            <div className={styles.trend}>
              {data.trend.length ? data.trend.map((item) => <div key={item.month} title={`${item.month}: ${money(item.revenueCents)}`}><i style={{ height: `${Math.max(4, item.revenueCents / maxTrend * 100)}%` }} /><small>{item.month.slice(5)}</small></div>) : <p>Noch keine bezahlten Rechnungen.</p>}
            </div>
          </article>
        </section>

        <section className={styles.secondaryMetrics}>
          <Metric label="Kundenwert realisiert" value={money(data.overview.averageCustomerValueCents)} note="Umsatz je zahlendem Kunden" />
          <Metric label="CAC · 90 Tage" value={data.overview.cac90dCents === null ? "—" : money(data.overview.cac90dCents)} note="Kosten je neuem Kunden" />
          <Metric label="Starter → Growth" value={String(data.overview.starterToGrowthUpgrades)} note="aktive Upgrades" />
          <Metric label="Kündigungsquote · 30 Tage" value={`${formatPercent(data.overview.churn30d)} %`} note={`${data.overview.pendingCancellations} vorgemerkt`} />
          <Metric label="Zahlungsrisiko" value={String(data.overview.atRiskCustomers)} note={`${data.overview.paymentFailures30d} Fehler in 30 Tagen`} tone={data.overview.atRiskCustomers ? "warning" : "normal"} />
          <Metric label="Enterprise" value={String(data.overview.enterpriseCustomers)} note="ohne pauschalen MRR-Wert" />
        </section>

        <section className={styles.twoColumns}>
          <article className={styles.panel}>
            <div className={styles.panelTitle}><div><span>Attribution</span><h2>Umsatz nach Quelle & Land</h2></div></div>
            <div className={styles.table}>
              <div className={styles.tableHead}><span>Quelle</span><span>Land</span><span>Kunden</span><span>Umsatz</span></div>
              {data.breakdown.length ? data.breakdown.map((row) => <div key={`${row.source}:${row.country}`}><strong>{sourceLabel(row.source)}</strong><span>{row.country}</span><span>{row.customers}</span><b>{money(row.revenueCents)}</b></div>) : <p>Noch keine Umsatzdaten vorhanden.</p>}
            </div>
          </article>
          <article className={styles.panel}>
            <div className={styles.panelTitle}><div><span>Kostenbasis</span><h2>Akquisekosten</h2></div></div>
            <form className={styles.costForm} onSubmit={saveCost}>
              <label><span>Monat</span><input name="periodStart" required type="date" /></label>
              <label><span>Quelle</span><input name="source" placeholder="google, outreach, instagram" required /></label>
              <label><span>Land</span><input defaultValue="ALL" maxLength={3} name="country" /></label>
              <label><span>Kosten EUR</span><input min="0" name="amount" required step="0.01" type="number" /></label>
              <button disabled={busy} type="submit">Speichern</button>
            </form>
            <div className={styles.costList}>{data.costs.slice(0, 6).map((cost) => <div key={cost.id}><span>{cost.periodStart.slice(0, 7)} · {sourceLabel(cost.source)} · {cost.country}</span><b>{money(cost.amountCents)}</b></div>)}</div>
          </article>
        </section>

        <aside className={`${styles.analyticsStatus} ${data.analytics.configured ? styles.ready : styles.pending}`}>
          <div><strong>GA4 Purchase Tracking</strong><span>{data.analytics.configured ? "Serverseitige Käufe werden nach Einwilligung automatisch übertragen." : "API-Secret fehlt noch; Käufe bleiben bis zur Einrichtung sicher vorgemerkt."}</span></div>
          <div><b>{data.analytics.delivery.sent ?? 0} gesendet</b><b>{data.analytics.delivery.pending ?? 0} offen</b><b>{data.analytics.delivery.failed ?? 0} fehlgeschlagen</b><b>{data.analytics.delivery.skipped ?? 0} ohne Einwilligung</b></div>
        </aside>
      </>}
    </main>
  );
}

function Metric({ label, note, tone = "normal", value }: { label: string; note: string; tone?: "normal" | "warning"; value: string }) {
  return <article className={tone === "warning" ? styles.warningMetric : ""}><span>{label}</span><strong>{value}</strong><small>{note}</small></article>;
}

function FunnelStep({ label, maximum, value }: { label: string; maximum: number; value: number }) {
  return <div><span><b>{label}</b><strong>{value}</strong></span><i><em style={{ width: `${Math.max(value ? 3 : 0, value / maximum * 100)}%` }} /></i></div>;
}

function money(cents: number) { return euro.format(cents / 100); }
function formatPercent(value: number) { return new Intl.NumberFormat("de-DE", { maximumFractionDigits: 1 }).format(value); }
function sourceLabel(value: string) { return value === "direct" || value === "widgets-pricing" ? "Direkt" : value.replace(/^utm:/, "").replace(/[-_]/g, " "); }
