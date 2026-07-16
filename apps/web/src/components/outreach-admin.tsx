"use client";

import { useEffect, useMemo, useState, type CSSProperties } from "react";
import type {
  OutreachAdminResponse,
  OutreachDraftView,
  OutreachProspectView
} from "@/lib/outreach-admin-types";
import styles from "./outreach-admin.module.css";

type DraftEdit = { subject: string; textBody: string };
type ApprovalEdit = {
  consentStatus: "explicit_consent" | "existing_customer_exception";
  consentEvidence: string;
  reviewer: string;
};

const researchCountries = [
  ["DE", "Deutschland"], ["AT", "Österreich"], ["CH", "Schweiz"], ["GB", "Großbritannien"],
  ["US", "USA"], ["CA", "Kanada"], ["AU", "Australien"], ["ES", "Spanien"],
  ["FR", "Frankreich"], ["IT", "Italien"], ["NL", "Niederlande"]
] as const;

export function OutreachAdmin() {
  const [data, setData] = useState<OutreachAdminResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [status, setStatus] = useState("Prospects werden geladen …");
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState("active");
  const [draftEdits, setDraftEdits] = useState<Record<string, DraftEdit>>({});
  const [approvalEdits, setApprovalEdits] = useState<Record<string, ApprovalEdit>>({});
  const [busyId, setBusyId] = useState<string | null>(null);
  const [researchCountriesSelected, setResearchCountriesSelected] = useState<string[]>(["DE"]);
  const [emailLanguage, setEmailLanguage] = useState("de");

  useEffect(() => {
    void loadProspects();
  }, []);

  const filteredProspects = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();
    return (data?.prospects ?? []).filter((prospect) => {
      if (filter === "active" && prospect.status === "rejected") return false;
      if (filter !== "all" && filter !== "active" && prospect.status !== filter) return false;
      if (!normalizedQuery) return true;
      return [prospect.publicationName, prospect.domain, prospect.summary, prospect.sourceQuery]
        .some((value) => value?.toLowerCase().includes(normalizedQuery));
    });
  }, [data, filter, query]);

  const stats = useMemo(() => {
    const prospects = data?.prospects ?? [];
    return {
      total: prospects.length,
      review: prospects.filter((item) => item.status === "pending_review").length,
      qualified: prospects.filter((item) => item.status === "qualified").length,
      sent: prospects.flatMap((item) => item.drafts).filter((draft) => draft.status === "sent").length
    };
  }, [data]);

  async function loadProspects() {
    setIsLoading(true);
    setStatus("Prospects werden geladen …");
    try {
      const response = await fetch("/api/admin/outreach", {
        cache: "no-store"
      });
      const body = await response.json() as OutreachAdminResponse & { message?: string };
      if (response.status === 401) {
        window.location.assign("/admin/login?next=/admin/outreach");
        return;
      }
      if (!response.ok) {
        throw new Error(body.message || "Prospects konnten nicht geladen werden.");
      }
      setData(body);
      setDraftEdits(buildDraftEdits(body.prospects));
      setStatus(`${body.prospects.length} Prospects geladen.`);
    } catch (error) {
      setData(null);
      setStatus(error instanceof Error ? error.message : "Prospects konnten nicht geladen werden.");
    } finally {
      setIsLoading(false);
    }
  }

  async function runAction(id: string, payload: Record<string, unknown>, successMessage: string) {
    setBusyId(id);
    setStatus("Aktion wird ausgeführt …");
    try {
      const response = await fetch("/api/admin/outreach", {
        method: "PATCH",
        headers: {
          "content-type": "application/json"
        },
        body: JSON.stringify(payload)
      });
      const body = await response.json() as { message?: string };
      if (!response.ok) {
        throw new Error(body.message || "Aktion fehlgeschlagen.");
      }
      setStatus(successMessage);
      await loadProspects();
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "Aktion fehlgeschlagen.");
    } finally {
      setBusyId(null);
    }
  }

  async function startResearch() {
    setBusyId("research");
    setStatus("Internationale Redaktionssuche wird eingeplant …");
    try {
      const response = await fetch("/api/admin/outreach", {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ action: "start_research", countries: researchCountriesSelected, emailLanguage })
      });
      const body = await response.json() as { jobs?: number; message?: string };
      if (!response.ok) throw new Error(body.message || "Recherche konnte nicht gestartet werden.");
      setStatus(`${body.jobs ?? researchCountriesSelected.length} Länder-Recherchen wurden gestartet. Es werden nur Redaktionen mit öffentlicher Funktions-E-Mail gespeichert.`);
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "Recherche konnte nicht gestartet werden.");
    } finally {
      setBusyId(null);
    }
  }

  return (
    <main className={styles.shell}>
      <header className={styles.header}>
        <div>
          <span className={styles.eyebrow}>AI Sports Prediction · Sales Operations</span>
          <h1>Outreach Cockpit</h1>
          <p>Publisher recherchieren, Entwürfe prüfen und ausschließlich freigegebene Kontakte einzeln versenden.</p>
        </div>
        <div className={styles.headerActions}>
          <button className={styles.secondaryButton} disabled={isLoading} onClick={() => void loadProspects()} type="button">
            {isLoading ? "Lädt …" : "Aktualisieren"}
          </button>
        </div>
      </header>

      {!data ? (
        <section className={styles.loginCard}>
          <div className={styles.lockIcon}>✦</div>
          <div>
            <h2>{isLoading ? "Outreach Cockpit wird geladen" : "Outreach ist derzeit nicht verfügbar"}</h2>
            <p>Der Zugriff erfolgt automatisch über eure geschützte Authenticator-Anmeldung.</p>
          </div>
          {!isLoading ? (
            <button className={styles.primaryButton} onClick={() => void loadProspects()} type="button">
              Erneut versuchen
            </button>
          ) : null}
          <StatusLine status={status} />
        </section>
      ) : (
        <>
          <section className={styles.researchPanel} aria-labelledby="research-title">
            <div>
              <span className={styles.eyebrow}>International Research Agent</span>
              <h2 id="research-title">Redaktionen nach Ländern finden</h2>
              <p>Die Suche nutzt die jeweilige Landesregion und Landessprache. Seiten ohne öffentlich bestätigte Funktions-E-Mail werden verworfen.</p>
            </div>
            <div className={styles.countryGrid}>
              {researchCountries.map(([code, name]) => (
                <label className={researchCountriesSelected.includes(code) ? styles.countrySelected : styles.countryOption} key={code}>
                  <input
                    checked={researchCountriesSelected.includes(code)}
                    onChange={(event) => setResearchCountriesSelected((current) => event.target.checked
                      ? [...new Set([...current, code])]
                      : current.filter((item) => item !== code))}
                    type="checkbox"
                  />
                  <span>{code}</span>{name}
                </label>
              ))}
            </div>
            <div className={styles.researchActions}>
              <label>
                <span>E-Mail-Sprache</span>
                <select data-testid="outreach-email-language" onChange={(event) => setEmailLanguage(event.target.value)} value={emailLanguage}>
                  <option value="de">Deutsch</option><option value="en">Englisch</option><option value="es">Spanisch</option>
                  <option value="fr">Französisch</option><option value="it">Italienisch</option><option value="nl">Niederländisch</option>
                </select>
              </label>
              <button className={styles.primaryButton} disabled={!data.researchConfigured || !researchCountriesSelected.length || busyId === "research"} onClick={() => void startResearch()} type="button">
                {busyId === "research" ? "Recherche startet …" : "Recherche starten"}
              </button>
              <small>{data.researchConfigured ? "Such-API und Queue sind bereit." : "Such-API oder Queue ist noch nicht konfiguriert."}</small>
            </div>
          </section>

          <section className={styles.statsGrid} aria-label="Outreach-Übersicht">
            <Stat label="Prospects" value={stats.total} />
            <Stat label="Zu prüfen" value={stats.review} />
            <Stat label="Freigegeben" value={stats.qualified} />
            <Stat label="Versendet" value={stats.sent} />
          </section>

          <section className={styles.controlBar}>
            <label>
              <span>Suche</span>
              <input onChange={(event) => setQuery(event.target.value)} placeholder="Publikation, Domain oder Thema" value={query} />
            </label>
            <label>
              <span>Status</span>
              <select onChange={(event) => setFilter(event.target.value)} value={filter}>
                <option value="active">Aktive Prospects</option>
                <option value="pending_review">Zu prüfen</option>
                <option value="qualified">Freigegeben</option>
                <option value="rejected">Abgelehnt / gesperrt</option>
                <option value="all">Alle</option>
              </select>
            </label>
            <div className={data.sendConfigured ? styles.configReady : styles.configWarning}>
              <strong>{data.sendConfigured ? "Versand bereit" : "Versand nicht konfiguriert"}</strong>
              <span>{data.sendConfigured ? "Resend und Absender erkannt" : "OUTREACH_FROM_EMAIL und Reply-To prüfen"}</span>
            </div>
          </section>

          <StatusLine status={status} />

          <section className={styles.prospectList}>
            {filteredProspects.length ? filteredProspects.map((prospect) => (
              <ProspectCard
                approvalEdits={approvalEdits}
                busyId={busyId}
                draftEdits={draftEdits}
                key={prospect.id}
                onApprovalChange={(draftId, next) => setApprovalEdits((current) => ({ ...current, [draftId]: next }))}
                onDraftChange={(draftId, next) => setDraftEdits((current) => ({ ...current, [draftId]: next }))}
                onRunAction={runAction}
                prospect={prospect}
                sendConfigured={data.sendConfigured}
              />
            )) : (
              <div className={styles.emptyState}>
                <strong>Keine Prospects in dieser Ansicht</strong>
                <span>Starte einen Recherchelauf oder ändere den Filter.</span>
              </div>
            )}
          </section>
        </>
      )}
    </main>
  );
}

function ProspectCard({
  approvalEdits,
  busyId,
  draftEdits,
  onApprovalChange,
  onDraftChange,
  onRunAction,
  prospect,
  sendConfigured
}: {
  approvalEdits: Record<string, ApprovalEdit>;
  busyId: string | null;
  draftEdits: Record<string, DraftEdit>;
  onApprovalChange: (draftId: string, value: ApprovalEdit) => void;
  onDraftChange: (draftId: string, value: DraftEdit) => void;
  onRunAction: (id: string, payload: Record<string, unknown>, successMessage: string) => Promise<void>;
  prospect: OutreachProspectView;
  sendConfigured: boolean;
}) {
  const isSuppressed = Boolean(prospect.suppressedAtUtc);
  return (
    <article className={styles.prospectCard}>
      <div className={styles.prospectHeader}>
        <div className={styles.score} style={{ "--score": `${prospect.fitScore}%` } as CSSProperties}>
          <strong>{prospect.fitScore}</strong><span>Fit</span>
        </div>
        <div className={styles.prospectTitle}>
          <div className={styles.badgeRow}>
            <StatusBadge status={prospect.status} />
            <ConsentBadge status={prospect.consentStatus} />
            {prospect.country ? <span className={styles.neutralBadge}>{prospect.country}</span> : null}
            {isSuppressed ? <span className={styles.dangerBadge}>Gesperrt</span> : null}
          </div>
          <h2>{prospect.publicationName}</h2>
          <a href={prospect.websiteUrl} rel="noreferrer" target="_blank">{prospect.domain} ↗</a>
        </div>
        <div className={styles.prospectActions}>
          <button
            className={styles.ghostButton}
            disabled={busyId === prospect.id || prospect.status === "rejected"}
            onClick={() => void onRunAction(prospect.id, { action: "reject_prospect", prospectId: prospect.id }, "Prospect abgelehnt.")}
            type="button"
          >Ablehnen</button>
          <button
            className={styles.dangerButton}
            disabled={busyId === prospect.id || isSuppressed}
            onClick={() => {
              if (window.confirm("Kontakt dauerhaft sperren und alle offenen Entwürfe ablehnen?")) {
                void onRunAction(prospect.id, { action: "suppress_prospect", prospectId: prospect.id }, "Kontakt dauerhaft gesperrt.");
              }
            }}
            type="button"
          >Sperren</button>
        </div>
      </div>

      <div className={styles.prospectMeta}>
        <div>
          <span>Warum passend</span>
          <ul>{prospect.fitReasons.map((reason) => <li key={reason}>{reason}</li>)}</ul>
        </div>
        <div>
          <span>Recherche</span>
          <p>{prospect.summary || "Keine Zusammenfassung verfügbar."}</p>
          {prospect.sourceUrl ? <a href={prospect.sourceUrl} rel="noreferrer" target="_blank">Suchtreffer prüfen ↗</a> : null}
        </div>
        <div>
          <span>Öffentliche Kontakte</span>
          <ul className={styles.contactList}>
            {prospect.contacts.map((contact) => (
              <li key={contact.id}>
                <a href={contact.kind === "generic_email" ? `mailto:${contact.value}` : contact.value} rel="noreferrer" target="_blank">
                  {contact.role ? `${contact.role}: ` : ""}{contact.value}
                </a>
                <a className={styles.sourceLink} href={contact.sourceUrl} rel="noreferrer" target="_blank">Quelle</a>
              </li>
            ))}
          </ul>
        </div>
      </div>

      <div className={styles.drafts}>
        {prospect.drafts.length ? prospect.drafts.map((draft) => (
          <DraftEditor
            approval={approvalEdits[draft.id] ?? emptyApproval()}
            busy={busyId === draft.id}
            draft={draft}
            edit={draftEdits[draft.id] ?? { subject: draft.subject, textBody: draft.textBody }}
            key={draft.id}
            onApprovalChange={(next) => onApprovalChange(draft.id, next)}
            onDraftChange={(next) => onDraftChange(draft.id, next)}
            onRunAction={onRunAction}
            sendConfigured={sendConfigured}
          />
        )) : <p className={styles.noDraft}>Keine Funktionsadresse gefunden – daher wurde kein E-Mail-Entwurf erstellt.</p>}
      </div>
    </article>
  );
}

function DraftEditor({ approval, busy, draft, edit, onApprovalChange, onDraftChange, onRunAction, sendConfigured }: {
  approval: ApprovalEdit;
  busy: boolean;
  draft: OutreachDraftView;
  edit: DraftEdit;
  onApprovalChange: (value: ApprovalEdit) => void;
  onDraftChange: (value: DraftEdit) => void;
  onRunAction: (id: string, payload: Record<string, unknown>, successMessage: string) => Promise<void>;
  sendConfigured: boolean;
}) {
  const editable = ["pending_review", "approved", "failed"].includes(draft.status);
  const approvable = draft.status === "pending_review";
  const sendable = draft.status === "approved" && sendConfigured;
  return (
    <section className={styles.draftCard}>
      <div className={styles.draftHeader}>
        <div><span>E-Mail-Entwurf</span><DraftBadge status={draft.status} /></div>
        <small>{draft.emailLanguage.toUpperCase()} · {draft.modelId ? `KI: ${draft.modelId}` : "Standardvorlage"}</small>
      </div>
      <label>
        <span>Betreff</span>
        <input disabled={!editable} onChange={(event) => onDraftChange({ ...edit, subject: event.target.value })} value={edit.subject} />
      </label>
      <label>
        <span>Nachricht</span>
        <textarea disabled={!editable} onChange={(event) => onDraftChange({ ...edit, textBody: event.target.value })} rows={10} value={edit.textBody} />
      </label>
      {draft.errorMessage ? <p className={styles.errorMessage}>{draft.errorMessage}</p> : null}
      <div className={styles.draftActions}>
        <button
          className={styles.secondaryButton}
          disabled={!editable || busy}
          onClick={() => void onRunAction(draft.id, { action: "update_draft", draftId: draft.id, ...edit }, "Entwurf gespeichert; Freigabe wurde zurückgesetzt.")}
          type="button"
        >Entwurf speichern</button>
        <button
          className={styles.primaryButton}
          disabled={!sendable || busy}
          onClick={() => {
            if (window.confirm("Diese einzelne, freigegebene E-Mail jetzt wirklich versenden?")) {
              void onRunAction(draft.id, { action: "send_draft", draftId: draft.id }, "E-Mail wurde versendet.");
            }
          }}
          type="button"
        >Einzeln versenden</button>
      </div>

      {approvable ? (
        <div className={styles.approvalPanel}>
          <div><strong>Freigabe mit Nachweis</strong><span>Eine veröffentlichte Adresse allein reicht nicht aus.</span></div>
          <label>
            <span>Rechtsgrundlage</span>
            <select value={approval.consentStatus} onChange={(event) => onApprovalChange({ ...approval, consentStatus: event.target.value as ApprovalEdit["consentStatus"] })}>
              <option value="explicit_consent">Ausdrückliche Einwilligung</option>
              <option value="existing_customer_exception">Geprüfte Bestandskundenausnahme</option>
            </select>
          </label>
          <label>
            <span>Konkreter Nachweis</span>
            <textarea onChange={(event) => onApprovalChange({ ...approval, consentEvidence: event.target.value })} placeholder="Quelle, Datum und Umfang der Einwilligung" rows={3} value={approval.consentEvidence} />
          </label>
          <label>
            <span>Geprüft von</span>
            <input onChange={(event) => onApprovalChange({ ...approval, reviewer: event.target.value })} placeholder="Name" value={approval.reviewer} />
          </label>
          <button
            className={styles.approveButton}
            disabled={busy || !approval.consentEvidence.trim() || !approval.reviewer.trim()}
            onClick={() => void onRunAction(draft.id, { action: "approve_draft", draftId: draft.id, ...approval }, "Entwurf freigegeben.")}
            type="button"
          >Nachweis bestätigen & freigeben</button>
        </div>
      ) : null}
    </section>
  );
}

function Stat({ label, value }: { label: string; value: number }) {
  return <div className={styles.stat}><span>{label}</span><strong>{value}</strong></div>;
}

function StatusLine({ status }: { status: string }) {
  return <p className={styles.statusLine} role="status">{status}</p>;
}

function StatusBadge({ status }: { status: OutreachProspectView["status"] }) {
  const labels = { discovered: "Gefunden", pending_review: "Zu prüfen", qualified: "Freigegeben", rejected: "Abgelehnt" };
  return <span className={styles.statusBadge}>{labels[status]}</span>;
}

function ConsentBadge({ status }: { status: OutreachProspectView["consentStatus"] }) {
  const labels = { unknown: "Keine Einwilligung", explicit_consent: "Einwilligung", existing_customer_exception: "Bestandskunde", declined: "Widerspruch" };
  return <span className={status === "unknown" ? styles.neutralBadge : styles.consentBadge}>{labels[status]}</span>;
}

function DraftBadge({ status }: { status: OutreachDraftView["status"] }) {
  const labels = { pending_review: "Prüfung", approved: "Freigegeben", rejected: "Abgelehnt", sending: "Versand läuft", sent: "Versendet", failed: "Fehler" };
  return <span className={styles.draftBadge}>{labels[status]}</span>;
}

function buildDraftEdits(prospects: OutreachProspectView[]): Record<string, DraftEdit> {
  return Object.fromEntries(prospects.flatMap((prospect) => prospect.drafts.map((draft) => [draft.id, {
    subject: draft.subject,
    textBody: draft.textBody
  }])));
}

function emptyApproval(): ApprovalEdit {
  return { consentStatus: "explicit_consent", consentEvidence: "", reviewer: "" };
}
