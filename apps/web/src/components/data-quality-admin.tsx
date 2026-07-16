"use client";

import { useEffect, useMemo, useState } from "react";
import type { SportsDataQualityOverview } from "@/lib/sports-data-quality-overview";
import styles from "./data-quality-admin.module.css";

type QualityResponse = SportsDataQualityOverview & {
  message?: string;
  ok: true;
};

const issueLabels = {
  champions_league_qualifier: "Champions-League-Qualifikation",
  competition_mismatch: "Falscher Wettbewerb",
  invalid_participant: "Falscher Teilnehmer",
  league_id_mismatch: "Falsche Liga-ID",
  missing_team_logo: "Teamlogo fehlt",
  missing_tennis_flag: "Tennisflagge fehlt",
  nba_team_mismatch: "Kein NBA-Team",
  nfl_team_mismatch: "Kein NFL-Team",
  sport_mismatch: "Falsche Sportart"
} as const;

export function DataQualityAdmin() {
  const [data, setData] = useState<QualityResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [status, setStatus] = useState("Sportdaten werden geprüft …");

  useEffect(() => {
    void loadReport();
  }, []);

  const targetGroups = useMemo(() => ({
    football: data?.targets.filter((target) => target.sport === "football") ?? [],
    other: data?.targets.filter((target) => target.sport !== "football") ?? []
  }), [data]);

  async function loadReport() {
    setIsLoading(true);
    setStatus("Sportdaten werden geprüft …");
    try {
      const response = await fetch("/api/admin/data-quality", { cache: "no-store" });
      const body = await response.json() as QualityResponse;
      if (response.status === 401) {
        window.location.assign("/admin/login?next=/admin/data-quality");
        return;
      }
      if (!response.ok) {
        throw new Error(body.message || "Qualitätsbericht konnte nicht geladen werden.");
      }
      setData(body);
      setStatus(body.blocked > 0
        ? `${body.blocked} Datensätze wurden automatisch gesperrt.`
        : "Alle geprüften Datensätze erfüllen die Freigaberegeln.");
    } catch (error) {
      setData(null);
      setStatus(error instanceof Error ? error.message : "Qualitätsbericht konnte nicht geladen werden.");
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <main className={styles.page}>
      <header className={styles.header}>
        <div>
          <span>AI Sports Prediction · Safety Gate</span>
          <h1>Datenqualität</h1>
          <p>Nur Spiele mit erlaubter Liga, korrekten Teilnehmern und echten Logos beziehungsweise Tennisflaggen werden veröffentlicht.</p>
        </div>
        <button disabled={isLoading} onClick={() => void loadReport()} type="button">
          {isLoading ? "Prüfung läuft …" : "Jetzt neu prüfen"}
        </button>
      </header>

      <p className={styles.status} role="status">{status}</p>

      {data ? (
        <>
          <section className={styles.metrics} aria-label="Qualitätskennzahlen">
            <Metric label="Geprüft" value={data.checked} />
            <Metric label="Freigegeben" tone="good" value={data.published} />
            <Metric label="Ausgeblendet" tone={data.blocked ? "danger" : "good"} value={data.blocked} />
            <Metric label="Datenquellen mit Hinweis" tone={data.sourceErrors ? "warning" : "good"} value={data.sourceErrors} />
          </section>

          <section className={styles.rules}>
            <span>Aktive Sperrregeln</span>
            <ul>
              <li>Exakte Liga-ID und Wettbewerb</li>
              <li>Nur echte NBA- und NFL-Teams</li>
              <li>DFB-Pokal · ID 4485</li>
              <li>UEFA Champions League · ID 4480 · ohne Qualifikation</li>
              <li>Echte HTTPS-Teamlogos</li>
              <li>Automatisch bestätigte Tennis-Länderflaggen</li>
            </ul>
          </section>

          <section className={styles.targetSection}>
            <div className={styles.sectionHeading}>
              <div><span>Allowlist</span><h2>Erlaubte Wettbewerbe</h2></div>
              <small>Stand {new Date(data.generatedAtUtc).toLocaleString("de-DE")}</small>
            </div>
            <div className={styles.targetGrid}>
              {[...targetGroups.football, ...targetGroups.other].map((target) => (
                <article className={target.blocked ? styles.targetWarning : styles.targetCard} key={`${target.sport}:${target.leagueId}`}>
                  <div>
                    <span>{target.sport.toUpperCase()}</span>
                    <b>{target.sourceStatus === "live" ? "Quelle aktiv" : "Quelle prüfen"}</b>
                  </div>
                  <h3>{target.competition}</h3>
                  <code>ID {target.leagueId}</code>
                  <p>{target.published} freigegeben · {target.blocked} ausgeblendet</p>
                </article>
              ))}
            </div>
          </section>

          <section className={styles.issueSection}>
            <div className={styles.sectionHeading}>
              <div><span>Quarantäne</span><h2>Automatisch ausgeblendete Datensätze</h2></div>
              <small>{data.issues.length} konkrete Hinweise</small>
            </div>
            {data.issues.length ? (
              <div className={styles.issueList}>
                {data.issues.map((issue, index) => (
                  <article key={`${issue.matchId}:${issue.code}:${index}`}>
                    <div>
                      <span>{issueLabels[issue.code]}</span>
                      <small>{issue.sport.toUpperCase()} · {issue.competition}</small>
                    </div>
                    <h3>{issue.participants}</h3>
                    <p>{issue.message}</p>
                    <code>{issue.matchId}</code>
                  </article>
                ))}
              </div>
            ) : (
              <div className={styles.empty}>
                <strong>Keine fehlerhaften Spiele gefunden</strong>
                <span>Neue API-Datensätze werden bei jedem Laden erneut durch dieselben Regeln geprüft.</span>
              </div>
            )}
          </section>
        </>
      ) : (
        <section className={styles.empty}>
          <strong>{isLoading ? "Qualitätsprüfung läuft" : "Bericht nicht verfügbar"}</strong>
          <span>Die öffentlichen Seiten bleiben währenddessen durch die gleichen Sperrregeln geschützt.</span>
        </section>
      )}
    </main>
  );
}

function Metric({ label, tone, value }: { label: string; tone?: "danger" | "good" | "warning"; value: number }) {
  return <article className={tone ? styles[tone] : undefined}><span>{label}</span><strong>{value}</strong></article>;
}
