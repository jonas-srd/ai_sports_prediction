import type { Metadata } from "next";
import Link from "next/link";
import styles from "./page.module.css";

export const metadata: Metadata = {
  title: "Agent Cockpit | AI Sports Prediction",
  robots: { index: false, follow: false }
};

const agentGroups = [
  {
    eyebrow: "Revenue Pipeline",
    title: "Leads & Checkouts",
    description: "Neue Interessenten, Outreach-Zuordnung, abgebrochene Checkouts, Prioritäten und automatische Wiedervorlagen in einer Pipeline.",
    href: "/admin/leads",
    action: "Lead-Cockpit öffnen",
    agents: ["Lead Scoring", "Checkout Recovery", "Outreach Linking", "Follow-up"]
  },
  {
    eyebrow: "Revenue Operations",
    title: "Widget Customers",
    description: "Aktive Kunden, API-Keys, erlaubte Domains, echte Aufrufe, Tariflimits, Rechnungen, Vertragsstatus und Kündigungen verwalten.",
    href: "/admin/customers",
    action: "Kundenverwaltung öffnen",
    agents: ["Access Control", "Usage Metering", "Billing Sync", "Contract Operations"]
  },
  {
    eyebrow: "Growth OS",
    title: "Marketing Agents",
    description: "Predictions auswählen, englische Inhalte und Bilder erzeugen, prüfen, veröffentlichen und aus Reichweite sowie Klicks lernen.",
    href: "/admin/marketing",
    action: "Marketing Studio öffnen",
    agents: ["Scout", "Copy", "Visual", "Compliance", "Publisher", "Performance"]
  },
  {
    eyebrow: "Sales Operations",
    title: "Outreach Agents",
    description: "Sportredaktionen nach Land recherchieren, Funktionsadressen qualifizieren, lokalisierte Entwürfe prüfen und freigegebene E-Mails einzeln versenden.",
    href: "/admin/outreach",
    action: "Outreach Cockpit öffnen",
    agents: ["Research", "Qualification", "Localization", "Sales Copy", "Review & Send"]
  },
  {
    eyebrow: "Safety Gate",
    title: "Data Quality Agent",
    description: "Prüft Liga-IDs, Wettbewerbe, Teams, Logos und Tennisflaggen. Fehlerhafte Spiele werden vor der Veröffentlichung gesperrt und hier nachvollziehbar gemeldet.",
    href: "/admin/data-quality",
    action: "Datenqualität öffnen",
    agents: ["League Allowlist", "Team Validation", "Logo Check", "Flag Resolver", "Quarantine"]
  }
] as const;

export default function AdminOverviewPage() {
  return (
    <main className={styles.page}>
      <header className={styles.hero}>
        <span>AI Sports Prediction · Private Operations</span>
        <h1>Alle Agents. Eine Anmeldung.</h1>
        <p>Nach der Authenticator-Anmeldung erreicht ihr jedes interne Cockpit ohne zusätzliche Tokens oder Passwörter.</p>
      </header>

      <section className={styles.grid} aria-label="Verfügbare Agent-Cockpits">
        {agentGroups.map((group) => (
          <article className={styles.card} key={group.title}>
            <span className={styles.eyebrow}>{group.eyebrow}</span>
            <h2>{group.title}</h2>
            <p>{group.description}</p>
            <ul>
              {group.agents.map((agent) => <li key={agent}>{agent}</li>)}
            </ul>
            <Link href={group.href}>{group.action}<span aria-hidden="true">→</span></Link>
          </article>
        ))}
      </section>

      <aside className={styles.security}>
        <strong>Geschützt durch eure Authenticator-Sitzung</strong>
        <span>Nur freigegebene E-Mail-Adressen können diese Cockpits aufrufen. Die Admin-Seiten werden nicht von Suchmaschinen indexiert.</span>
      </aside>
    </main>
  );
}
