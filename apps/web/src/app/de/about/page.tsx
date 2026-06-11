import type { Metadata } from "next";

import { ObfuscatedEmail } from "@/components/obfuscated-email";

export const metadata: Metadata = {
  title: "Info | LLM SoccerArena",
  description: "Projektüberblick, Methodik, Wertung und Grenzen von LLM SoccerArena."
};

const pipelineSteps = [
  {
    title: "1. Spiele und Metadaten",
    text: "Wir halten Spielplan, Teams, Anstoßzeiten, Turnierphasen, Stadien und offizielle Ergebnisse an einem Ort zusammen."
  },
  {
    title: "2. Prognoseläufe",
    text: "Jedes Modell tippt in einem klar benannten Setup: Zeitpunkt, Informationszugriff, Prompt-Stil und Sample-ID."
  },
  {
    title: "3. Output-Checks",
    text: "Wir prüfen, ob die Antwort sauber nutzbar ist: Ergebnis, Wahrscheinlichkeiten, Pflichtfelder und genug Informationen für die Wertung."
  },
  {
    title: "4. Wertung",
    text: "Sobald ein Spiel beendet ist, bekommen die Tipps einfache Match-Punkte plus zusätzliche Metriken für Wahrscheinlichkeiten und Trefferqualität."
  },
  {
    title: "5. Öffentliches Dashboard",
    text: "Die Website macht daraus Rankings, Match-Ansichten, Fragen-Tabellen, den Turnierbaum und Analysen."
  }
];

const methodGroups = [
  {
    title: "Zeitpunkt",
    intro: "Dasselbe Spiel kann zu verschiedenen Momenten getippt werden, weil sich die Lage vor Anpfiff verändern kann.",
    entries: [
      {
        label: "Prognosehorizonte",
        text: "Ein Horizont sagt, wann der Tipp entstanden ist: zum Beispiel zum Phasenstart, 24 Stunden vor Anpfiff oder 2 Stunden vor Anpfiff."
      }
    ]
  },
  {
    title: "Informationszugriff",
    intro: "Manche Läufe sind bewusst abgeschirmt, andere dürfen aktuelle öffentliche Informationen nutzen.",
    entries: [
      {
        label: "Closed Book",
        text: "Das Modell bekommt nur die Spieldaten. Es soll keine Suche, Tools, Quoten, News, Aufstellungen oder frische externe Infos nutzen."
      },
      {
        label: "Open Book",
        text: "Das Modell darf konfigurierte Suche oder Tools verwenden. So sieht man, ob aktuelle Informationen dem Tipp helfen."
      }
    ]
  },
  {
    title: "Antwortstil",
    intro: "Wir variieren den Prompt, um zu sehen, ob Modelle anders tippen, wenn sie zuerst an Ergebnisse oder zuerst an Wahrscheinlichkeiten denken.",
    entries: [
      {
        label: "Direct Score",
        text: "Das Modell nennt zuerst das wahrscheinlichste Ergebnis und gibt zusätzlich Sieg-, Remis-, Niederlage- und bei Bedarf Weiterkommenswahrscheinlichkeiten."
      },
      {
        label: "Probabilistic Forecast",
        text: "Das Modell startet mit Wahrscheinlichkeiten und nennt danach das wahrscheinlichste Ergebnis. Dadurch wird die Sicherheit leichter vergleichbar."
      },
      {
        label: "Bestes pro Modell",
        text: "Die Startseite zeigt normalerweise das stärkste Setup pro Modell, damit das Ranking lesbar bleibt. Filter zeigen alle Varianten."
      }
    ]
  }
];

const metrics = [
  {
    label: "Match-Punkte",
    text: "Exaktes Ergebnis nach 90 Minuten gibt 5 Punkte, richtige Tordifferenz 2, richtige Tendenz 1 und Fehltipps 0."
  },
  {
    label: "Brier Score",
    text: "Misst die probabilistische Kalibrierung von Ergebniswahrscheinlichkeiten. Niedriger ist besser."
  },
  {
    label: "Log Loss",
    text: "Bestraft selbstsichere Wahrscheinlichkeitsprognosen, die dem tatsächlichen Resultat niedrige Wahrscheinlichkeit geben. Niedriger ist besser."
  },
  {
    label: "Genauigkeitsflags",
    text: "Erfassen exakte Ergebnisse, Tordifferenz, Tendenz, Top-Outcome und Weiterkommen in K.-o.-Spielen."
  },
  {
    label: "Zuverlässigkeitsmetriken",
    text: "Erfassen ungültige Ausgaben, reparierte Ausgaben, Normalisierung, Tool-Nutzung und Konsistenz zwischen Ergebnis-Tipp und Wahrscheinlichkeitsmaximum."
  }
];

const questionMethods = [
  {
    label: "Zusatzfragen",
    text: "Modelle beantworten zusätzlich 15 turnierweite Fragen: Gruppensieger, Halbfinalisten, Team des Torschützenkönigs und Weltmeister."
  },
  {
    label: "Fragenanzeige",
    text: "Die Startseite zeigt eine Zeile pro Modell-Setup und eine Spalte pro Frage. Tipps erscheinen als Flaggen; die kurze Begründung steckt hinter dem Info-Icon."
  },
  {
    label: "Fragenwertung",
    text: "Die Fragenwertung ist vom Match-Ranking getrennt. Jede richtige Antwort gibt 5 Punkte; falsche oder noch offene Antworten geben 0."
  },
  {
    label: "Offizielle Antworten",
    text: "Die Tabelle enthält eine Zeile mit offiziellen Resultaten. Manche Antworten werden im Turnierverlauf klar, andere erst ganz am Ende."
  }
];

export default function GermanAboutPage() {
  return (
    <main className="shell aboutShell">
      <section className="hero compactHero heroCentered">
        <p className="eyebrow">Über das Projekt</p>
        <h1>Was macht LLM SoccerArena?</h1>
        <p className="heroText">
          LLM SoccerArena vergleicht, wie große Sprachmodelle die FIFA-Weltmeisterschaft 2026 tippen.
          Die Seite sammelt die Vorhersagen, prüft ob sie nutzbar sind, wertet sie gegen echte Ergebnisse aus und zeigt die verschiedenen Modellvarianten im Dashboard.
        </p>
      </section>

      <section className="panel aboutIntroPanel">
        <p className="sectionKicker">Kernidee</p>
        <h2>Ein Benchmark, viele Modellkonfigurationen</h2>
        <p>
          Der Benchmark vergleicht ganze Tipp-Setups, nicht nur Modellnamen. Eine Zeile kann ein bestimmtes Modell mit einem bestimmten Zeitpunkt,
          Informationszugriff, Prompt-Stil und einer Sample-ID bedeuten. So werden die Varianten sichtbar, statt alles in einen Topf zu werfen.
        </p>
        <p>
          Die Startseite beginnt mit einer einfachen Ansicht: bestes Setup pro Modell. Über Filter kann man die vollständigen Varianten direkt vergleichen.
        </p>
      </section>

      <section className="aboutGrid">
        <div className="panel aboutPanel">
          <p className="sectionKicker">Pipeline</p>
          <h2>Was Schritt für Schritt passiert</h2>
          <div className="aboutStepList">
            {pipelineSteps.map((step) => (
              <div className="aboutStep" key={step.title}>
                <strong>{step.title}</strong>
                <p>{step.text}</p>
              </div>
            ))}
          </div>
        </div>

        <div className="panel aboutPanel">
          <p className="sectionKicker">Methodik</p>
          <h2>Wie Match-Prognosen variieren</h2>
          <div className="aboutMethodGroupList">
            {methodGroups.map((group) => (
              <div className="aboutMethodGroup" key={group.title}>
                <div>
                  <strong>{group.title}</strong>
                  <p>{group.intro}</p>
                </div>
                <div className="aboutDefinitionList">
                  {group.entries.map((entry) => (
                    <div className="aboutDefinition" key={entry.label}>
                      <strong>{entry.label}</strong>
                      <p>{entry.text}</p>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="aboutGrid">
        <div className="panel aboutPanel">
          <p className="sectionKicker">Zusatzfragen</p>
          <h2>Turnierweite Prognosen</h2>
          <div className="aboutDefinitionList">
            {questionMethods.map((entry) => (
              <div className="aboutDefinition" key={entry.label}>
                <strong>{entry.label}</strong>
                <p>{entry.text}</p>
              </div>
            ))}
          </div>
        </div>

        <div className="panel aboutPanel">
          <p className="sectionKicker">Auswertung</p>
          <h2>Wie Prognosen bewertet werden</h2>
          <div className="aboutDefinitionList">
            {metrics.map((entry) => (
              <div className="aboutDefinition" key={entry.label}>
                <strong>{entry.label}</strong>
                <p>{entry.text}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="aboutGrid">
        <div className="panel aboutPanel aboutCautionPanel">
          <p className="sectionKicker">Interpretation</p>
          <h2>Was das Ranking bedeutet</h2>
          <p>
            Eine hohe Punktzahl bedeutet, dass ein Modell-Setup bei bereits bekannten Ergebnissen gut abgeschnitten hat.
            Das beweist kein allgemeines Fußballverständnis und garantiert nicht die nächsten Spiele.
          </p>
          <p>
            Rankings können sich bewegen, wenn weitere Spiele gespielt werden, neue Horizonte dazukommen,
            Zusatzfragen entschieden sind und offene Prognosen Punkte bekommen.
          </p>
          <p>Die Prognosen sind Forschungsergebnisse. Sie sind keine Wettberatung und keine Empfehlung.</p>
        </div>

        <div className="panel aboutPanel">
          <p className="sectionKicker">Grenzen</p>
          <h2>Was zu beachten ist</h2>
          <div className="aboutDefinitionList">
            <div className="aboutDefinition">
              <strong>Kleine Stichproben am Anfang</strong>
              <p>Zu Turnierbeginn sind viele Wertungen offen, daher können Leaderboards instabil sein.</p>
            </div>
            <div className="aboutDefinition">
              <strong>Open-Book-Beobachtbarkeit</strong>
              <p>Suchläufe werden getrackt, aber Tool-Verhalten hängt von Provider-Support und sichtbaren Tool-Spuren ab.</p>
            </div>
            <div className="aboutDefinition">
              <strong>Fußballunsicherheit</strong>
              <p>Auch gut kalibrierte Prognosen können falsch sein, weil Fußball rauschanfällig und torarm ist.</p>
            </div>
          </div>
        </div>
      </section>

      <section className="panel aboutPanel aboutTeamPanel">
        <p className="sectionKicker">Entwicklerteam</p>
        <h2>Projektbeiträge</h2>
        <div className="aboutTeamList">
          <div className="aboutTeamMember">
            <strong>Jonas Schweisthal</strong>
            <p>Doktorand an der LMU Munich & Munich Center for Machine Learning (MCML). Konzeption und Umsetzung von Benchmark-Workflow, Prognoseprotokoll, Scoring-Pipeline, Datenbankarchitektur und Dashboard.</p>
            <ObfuscatedEmail reversedDomain="ed.uml" reversedLocalPart="lahtsiewhcs.sanoj" />
          </div>
          <div className="aboutTeamMember">
            <strong>Jonas Schröder</strong>
            <p>Doktorand an der LMU Munich & Munich Center for Machine Learning (MCML). Konzeption und Umsetzung von Benchmark-Workflow, Prognoseprotokoll, Scoring-Pipeline, Datenbankarchitektur und Dashboard.</p>
            <ObfuscatedEmail reversedDomain="ed.uml" reversedLocalPart="redeorhcs.sanoj" />
          </div>
          <div className="aboutTeamMember">
            <strong>Oliver Müller</strong>
            <p>Wissenschaftlicher Mitarbeiter. Professor für Data Analytics an der Universität Paderborn & Head of AI Competence Center des Software Innovation Campus Paderborn (SICP).</p>
          </div>
          <div className="aboutTeamMember">
            <strong>Markus Weinmann</strong>
            <p>Projektleitung. Professor für Business Analytics an der Universität zu Köln & Institute for Business AI.</p>
          </div>
          <div className="aboutTeamMember">
            <strong>Stefan Feuerriegel</strong>
            <p>Projektleitung. Professor in AI for Management an der LMU Munich School of Management & Munich Center for Machine Learning (MCML).</p>
            <ObfuscatedEmail reversedDomain="ed.uml" reversedLocalPart="legeirreuef.nafets" />
          </div>
        </div>
      </section>

      <section className="panel aboutPanel aboutResearchPanel">
        <p className="sectionKicker">Research Paper</p>
        <h2>LLM SoccerArena Paper</h2>
        <a className="aboutPdfBox" href="/research-paper.pdf" target="_blank" rel="noreferrer">
          <span>PDF</span>
          <strong>Paper öffnen</strong>
          <p>Das vollständige Paper wird hier als PDF verfügbar sein.</p>
        </a>
      </section>
    </main>
  );
}
