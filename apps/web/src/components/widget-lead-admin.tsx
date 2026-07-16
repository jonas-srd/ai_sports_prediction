"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import styles from "./widget-customer-admin.module.css";

type Lead = {
  checkout_abandoned_at_utc: string | null;
  created_at_utc: string;
  domain: string;
  email: string;
  id: string;
  next_follow_up_at_utc: string | null;
  outreach_name: string | null;
  pipeline_stage: string;
  priority_score: number;
  publication_name: string;
  requested_plan: string;
};

const stages = ["new", "contacted", "checkout", "paid", "active", "lost"] as const;

export function WidgetLeadAdmin() {
  const [leads, setLeads] = useState<Lead[]>([]);
  const [summary, setSummary] = useState<Record<string, number>>({});
  const [selected, setSelected] = useState<string>("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const active = useMemo(() => leads.find((lead) => lead.id === selected) ?? leads[0] ?? null, [leads, selected]);

  const load = useCallback(async () => {
    const response = await fetch("/api/admin/widget-leads", { cache: "no-store" });
    const payload = await response.json();
    if (!response.ok) throw new Error(payload.error);
    setLeads(payload.leads);
    setSummary(payload.summary);
  }, []);
  useEffect(() => { void load().catch(() => setError("Lead-Cockpit konnte nicht geladen werden.")); }, [load]);

  async function update(stage: string) {
    if (!active) return;
    setBusy(true);
    const response = await fetch("/api/admin/widget-leads", {
      body: JSON.stringify({ leadId: active.id, stage }),
      headers: { "content-type": "application/json" },
      method: "PATCH"
    });
    setBusy(false);
    if (!response.ok) setError("Lead konnte nicht aktualisiert werden.");
    else await load();
  }

  return (
    <main className={styles.page}>
      <header className={styles.hero}><div><span>Revenue Operations</span><h1>Lead- & Checkout-Cockpit</h1><p>Vom ersten Interesse über Checkout und Zahlung bis zum aktiven Widget-Kunden – mit automatischer Wiedervorlage.</p></div><button onClick={() => void load()} type="button">Aktualisieren</button></header>
      {error ? <p className={styles.status}>{error}</p> : null}
      <section className={styles.metrics}>{stages.slice(0, 4).map((stage) => <article key={stage}><span>{label(stage)}</span><strong>{summary[stage] ?? 0}</strong></article>)}</section>
      <section className={styles.workspace}>
        <aside className={styles.list}>{leads.map((lead) => (
          <button className={active?.id === lead.id ? styles.selected : ""} key={lead.id} onClick={() => setSelected(lead.id)} type="button">
            <span><b>{lead.publication_name}</b><em className={lead.pipeline_stage === "active" ? styles.good : lead.checkout_abandoned_at_utc ? styles.warning : styles.muted}>{label(lead.pipeline_stage)}</em></span>
            <small>{lead.domain} · {lead.requested_plan} · Score {lead.priority_score}</small>
          </button>
        ))}</aside>
        {active ? <div className={styles.detail}>
          <header className={styles.title}><div><span>{active.requested_plan} · Priorität {active.priority_score}</span><h2>{active.publication_name}</h2><p>{active.email} · {active.domain}</p></div><div className={styles.badges}><b className={styles.good}>{label(active.pipeline_stage)}</b></div></header>
          <div className={styles.columns}>
            <article className={styles.panel}><h3>Automatische Zuordnung</h3><p>{active.outreach_name ? `Mit Outreach-Prospect „${active.outreach_name}“ verbunden.` : "Noch kein Outreach-Kontakt mit derselben Domain vorhanden."}</p><p>{active.next_follow_up_at_utc ? `Nächste Wiedervorlage: ${new Date(active.next_follow_up_at_utc).toLocaleString("de-DE")}` : "Keine offene Wiedervorlage."}</p></article>
            <article className={styles.panel}><h3>Pipeline aktualisieren</h3><div className={styles.actions}>{stages.map((stage) => <button disabled={busy || stage === active.pipeline_stage} key={stage} onClick={() => void update(stage)} type="button">{label(stage)}</button>)}</div></article>
          </div>
        </div> : <p className={styles.empty}>Noch keine Leads vorhanden.</p>}
      </section>
    </main>
  );
}

function label(stage: string) {
  return ({ new: "Neu", contacted: "Kontaktiert", checkout: "Checkout", paid: "Bezahlt", active: "Aktiv", lost: "Verloren" } as Record<string, string>)[stage] ?? stage;
}
