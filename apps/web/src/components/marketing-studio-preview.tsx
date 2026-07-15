"use client";

import { useState } from "react";
import Link from "next/link";
import styles from "./marketing-studio-preview.module.css";

const channels = [
  { name: "Instagram", icon: "◎", status: "Bereit", tone: "mint", detail: "Feed + Story" },
  { name: "X", icon: "𝕏", status: "Bereit", tone: "blue", detail: "Post + Visual" },
  { name: "Reddit", icon: "●", status: "Review", tone: "orange", detail: "r/soccer" },
  { name: "TikTok", icon: "♪", status: "Entwurf", tone: "pink", detail: "Photo draft" }
] as const;

const weekly = [
  { day: "Mo", impressions: 32, clicks: 18 },
  { day: "Di", impressions: 48, clicks: 29 },
  { day: "Mi", impressions: 39, clicks: 24 },
  { day: "Do", impressions: 66, clicks: 47 },
  { day: "Fr", impressions: 58, clicks: 36 },
  { day: "Sa", impressions: 92, clicks: 76 },
  { day: "So", impressions: 74, clicks: 61 }
];

export function MarketingStudioPreview() {
  const [format, setFormat] = useState<"feed" | "story">("feed");
  const [channel, setChannel] = useState("Instagram");

  return (
    <main className={styles.shell}>
      <header className={styles.header}>
        <div>
          <div className={styles.kickerRow}>
            <span className={styles.eyebrow}>AI Sports Prediction · Growth OS</span>
            <span className={styles.demoBadge}><i /> Live-Vorschau · Demo-Daten</span>
            <span className={styles.languageBadge}>Content · English only</span>
          </div>
          <h1>Marketing Studio</h1>
          <p>Aus Predictions werden freigegebene Kampagnen – und aus echten Reaktionen bessere nächste Posts.</p>
        </div>
        <div className={styles.headerActions}>
          <Link className={styles.ghostButton} href="/admin/outreach">Outreach Cockpit</Link>
          <button className={styles.primaryButton} type="button">Neue Kampagne</button>
        </div>
      </header>

      <section className={styles.agentRail} aria-label="Marketing-Agenten">
        {[
          ["01", "Scout", "Prediction gewählt", "done"],
          ["02", "Copy", "4 Kanäle erstellt", "done"],
          ["03", "Visual", "4 Formate gerendert", "done"],
          ["04", "Compliance", "Keine Risiken", "done"],
          ["05", "Publisher", "Freigabe wartet", "active"],
          ["06", "Performance", "Lernt aus Daten", "learning"]
        ].map(([number, name, detail, state], index) => (
          <div className={`${styles.agentStep} ${styles[state as keyof typeof styles]}`} key={name}>
            <span className={styles.agentNumber}>{number}</span>
            <div><strong>{name}</strong><small>{detail}</small></div>
            {index < 5 ? <span className={styles.connector} /> : null}
          </div>
        ))}
      </section>

      <section className={styles.statsGrid}>
        <Metric label="Reichweite" value="28.4K" change="+18,6 %" spark={[24, 31, 28, 42, 51, 58, 72]} />
        <Metric label="Klicks" value="1.126" change="+24,1 %" spark={[12, 18, 17, 31, 29, 43, 57]} />
        <Metric label="Klickrate" value="4,0 %" change="+0,7 Pkt." spark={[18, 22, 19, 26, 31, 36, 43]} />
        <Metric label="Engagement" value="7,8 %" change="+1,2 Pkt." spark={[21, 24, 29, 27, 38, 44, 50]} />
      </section>

      <div className={styles.mainGrid}>
        <section className={styles.campaignPanel}>
          <div className={styles.sectionHeader}>
            <div><span className={styles.sectionKicker}>Nächste Kampagne</span><h2>FA Cup Match Prediction</h2></div>
            <span className={styles.reviewBadge}>Zur Freigabe</span>
          </div>

          <div className={styles.campaignGrid}>
            <div>
              <div className={styles.formatSwitch}>
                <button className={format === "feed" ? styles.selected : ""} onClick={() => setFormat("feed")} type="button">Feed · 1:1</button>
                <button className={format === "story" ? styles.selected : ""} onClick={() => setFormat("story")} type="button">Story · 9:16</button>
              </div>
              <div className={`${styles.socialVisual} ${format === "story" ? styles.storyVisual : ""}`} data-testid="marketing-visual-preview">
                <div className={styles.visualTop}><strong>AI SPORTS PREDICTION</strong><span>FA CUP</span></div>
                <div className={styles.matchup}>
                  <strong>Arsenal</strong><span>VS</span><strong>Liverpool</strong>
                </div>
                <div className={styles.score}>2:1</div>
                <p>Arsenal with <strong>68%</strong> model confidence</p>
                <span className={styles.tendency}>Pick: Arsenal</span>
                {format === "story" ? <b className={styles.storyCta}>MORE AI PREDICTIONS ↗</b> : null}
                <small>20 Jul 2026, 20:00 · AI prediction, not a guarantee</small>
              </div>
            </div>

            <div className={styles.copyPanel}>
              <div className={styles.channelTabs}>
                {channels.map((item) => (
                  <button className={channel === item.name ? styles.activeChannel : ""} key={item.name} onClick={() => setChannel(item.name)} type="button">
                    <span>{item.icon}</span>{item.name}
                  </button>
                ))}
              </div>
              <div className={styles.copyCard}>
                <div className={styles.copyMeta}><span>{channel} Entwurf</span><b>KI + Compliance geprüft</b></div>
                {channel === "Instagram" ? (
                  <p>Our AI prediction for Arsenal vs Liverpool: <strong>2:1</strong>.<br /><br />Model pick: Arsenal · Confidence: 68%. The model weighs form, matchup context, and the available competition data.<br /><br />AI prediction, not a guarantee.<br /><br /><em>#AISportsPrediction #FACup #Football</em></p>
                ) : channel === "X" ? (
                  <p>AI match prediction: Arsenal – Liverpool 2:1. Pick: Arsenal, confidence 68%. AI prediction, not a guarantee. <em>#FACup</em></p>
                ) : channel === "TikTok" ? (
                  <p>Arsenal vs Liverpool: our model predicts <strong>2:1</strong>.<br /><br />Pick: Arsenal · Confidence: 68%.<br /><br />AI prediction, not a guarantee.<br /><br /><em>#AISportsPrediction #FACup #Football</em></p>
                ) : (
                  <p><strong>AI prediction: Arsenal vs Liverpool (2:1)</strong><br /><br />Our model gives Arsenal the edge with 68% confidence. It weighs form, matchup context, and the available competition data. How do you see this matchup playing out?</p>
                )}
                <div className={styles.safetyChecks}>
                  <span>✓ Keine Garantie</span><span>✓ Keine Wettaufforderung</span><span>✓ Faktenbasiert</span>
                </div>
              </div>
              <div className={styles.publishTargets}>
                {channels.map((item) => (
                  <div key={item.name}><span className={styles[item.tone]}>{item.icon}</span><div><strong>{item.name}</strong><small>{item.detail}</small></div><b>{item.status}</b></div>
                ))}
              </div>
              <div className={styles.actionRow}>
                <button className={styles.ghostButton} type="button">Bearbeiten</button>
                <button className={styles.primaryButton} type="button">Kampagne freigeben</button>
              </div>
            </div>
          </div>
        </section>

        <aside className={styles.insightsPanel}>
          <div className={styles.sectionHeader}>
            <div><span className={styles.sectionKicker}>Performance Agent</span><h2>Was wir lernen</h2></div>
            <span className={styles.livePulse}><i /> Aktiv</span>
          </div>
          <div className={styles.recommendationHigh}>
            <span>Hohe Priorität</span>
            <h3>CTA früher platzieren</h3>
            <p>Posts mit klarem Nutzen vor dem Link erzielen aktuell deutlich mehr Klicks.</p>
            <div><b>+31 %</b><small>Klickrate bei Nutzen-Hooks</small></div>
          </div>
          <div className={styles.recommendation}>
            <span>Format-Signal</span><h3>Story als Leitformat</h3>
            <p>9:16-Motive haben die beste Engagement-Rate. Das Layout auf X übertragen.</p>
          </div>
          <div className={styles.recommendation}>
            <span>Zeitfenster</span><h3>Samstag, 17–20 Uhr</h3>
            <p>Dieses Fenster liefert 1,6× mehr Reichweite als der Wochenmittelwert.</p>
          </div>
          <button className={styles.insightButton} type="button">Alle Empfehlungen ansehen →</button>
        </aside>
      </div>

      <section className={styles.analyticsPanel}>
        <div className={styles.sectionHeader}>
          <div><span className={styles.sectionKicker}>Letzte 7 Tage</span><h2>Reichweite & Klicks</h2></div>
          <div className={styles.legend}><span><i className={styles.impressionDot} />Impressionen</span><span><i className={styles.clickDot} />Klicks</span></div>
        </div>
        <div className={styles.chart}>
          {weekly.map((item) => (
            <div className={styles.chartColumn} key={item.day}>
              <div className={styles.barArea}>
                <span className={styles.impressionBar} style={{ height: `${item.impressions}%` }} />
                <span className={styles.clickBar} style={{ height: `${item.clicks}%` }} />
              </div>
              <small>{item.day}</small>
            </div>
          ))}
        </div>
        <div className={styles.channelSummary}>
          <ChannelSummary color="mint" label="Instagram" reach="16.8K" clicks="594" rate="3,5 % CTR" />
          <ChannelSummary color="blue" label="X" reach="8.9K" clicks="418" rate="4,7 % CTR" />
          <ChannelSummary color="orange" label="Reddit" reach="2.7K" clicks="114" rate="4,2 % CTR" />
          <ChannelSummary color="pink" label="TikTok" reach="Neu" clicks="–" rate="Draft API" />
        </div>
      </section>
    </main>
  );
}

function Metric({ label, value, change, spark }: { label: string; value: string; change: string; spark: number[] }) {
  return <article className={styles.metricCard}><span>{label}</span><div><strong>{value}</strong><b>{change}</b></div><div className={styles.spark}>{spark.map((height, index) => <i key={index} style={{ height: `${height}%` }} />)}</div></article>;
}

function ChannelSummary({ color, label, reach, clicks, rate }: { color: "mint" | "blue" | "orange" | "pink"; label: string; reach: string; clicks: string; rate: string }) {
  return <div className={styles.channelSummaryItem}><i className={styles[color]} /><strong>{label}</strong><span>{reach} Reichweite</span><span>{clicks} Klicks</span><b>{rate}</b></div>;
}
