import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Info | LLM SoccerArena",
  description: "Projektuberblick, Methodik, Wertung und Grenzen von LLM SoccerArena."
};

const pipelineSteps = [
  {
    title: "1. Spiele und Metadaten",
    text: "Die Datenbank speichert den WM-2026-Spielplan, Teams, Anstosszeiten, Turnierphasen, Stadien und spater die offiziellen Ergebnisse nach 90 Minuten und nach Spielende."
  },
  {
    title: "2. Kontrollierte Prognoselaufe",
    text: "Jedes Modell tippt unter definierten Bedingungen: Prognosehorizont, Zugriff, Prompt-Strategie und Sample-ID. Verglichen werden Setups, nicht nur Modellnamen."
  },
  {
    title: "3. Ausgabevalidierung",
    text: "Antworten werden geparst, wenn moglich normalisiert und auf gultige Wahrscheinlichkeiten, gultige Ergebnisse, Pflichtfelder und Wertbarkeit gepruft."
  },
  {
    title: "4. Ergebnisauswertung",
    text: "Sobald echte Resultate bekannt sind, erhalten Match-Prognosen Kicktipp-Punkte und Benchmark-Metriken wie Brier Score, Log Loss und Genauigkeitsflags."
  },
  {
    title: "5. Offentliches Dashboard",
    text: "Die Website aggregiert die Daten in Startseiten-Ranking, Fragen-Tabelle, Spielplan, Turnierbaum und Analyseansichten."
  }
];

const methods = [
  {
    label: "Prognosehorizonte",
    text: "Ein Horizont beschreibt, wann eine Prognose erstellt wurde, etwa zum Phasenstart, 24 Stunden vor Anpfiff oder 2 Stunden vor Anpfiff."
  },
  {
    label: "Closed Book",
    text: "Das Modell erhalt nur spielidentifizierende Informationen und darf keine Websuche, externen Tools, Quoten, Nachrichten, Aufstellungen oder kuratierten aktuellen Daten nutzen."
  },
  {
    label: "Open Book",
    text: "Das Modell darf konfigurierte Such- oder Toolzugriffe vor der Antwort verwenden. So wird getestet, ob aktuelle offentliche Informationen Prognosen verbessern."
  },
  {
    label: "Direct Score",
    text: "Der Prompt fragt nach dem wahrscheinlichsten Ergebnis und fordert trotzdem Wahrscheinlichkeiten fur Heimsieg, Unentschieden, Auswartssieg und, falls relevant, Weiterkommen."
  },
  {
    label: "Probabilistic Forecast",
    text: "Der Prompt stellt kalibrierte Wahrscheinlichkeiten zuerst in den Mittelpunkt und meldet danach das wahrscheinlichste Ergebnis."
  },
  {
    label: "Bestes pro Modell",
    text: "Die Standardansicht zeigt pro Modell das beste Setup fur bessere Lesbarkeit. Benutzerdefinierte Filter konnen alle oder ausgewahlte Konfigurationen anzeigen."
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
    text: "Bestraft selbstsichere Wahrscheinlichkeitsprognosen, die dem tatsachlichen Resultat niedrige Wahrscheinlichkeit geben. Niedriger ist besser."
  },
  {
    label: "Genauigkeitsflags",
    text: "Erfassen exakte Ergebnisse, Tordifferenz, Tendenz, Top-Outcome und Weiterkommen in K.-o.-Spielen."
  },
  {
    label: "Zuverlassigkeitsmetriken",
    text: "Erfassen ungultige Ausgaben, reparierte Ausgaben, Normalisierung, Tool-Nutzung und Konsistenz zwischen Ergebnis-Tipp und Wahrscheinlichkeitsmaximum."
  }
];

const questionMethods = [
  {
    label: "Zusatzfragen",
    text: "Modelle beantworten zusatzlich 15 turnierweite Fragen: 12 Gruppensieger, Halbfinalisten, Team des Torschutzenkonigs und Weltmeister."
  },
  {
    label: "Fragenanzeige",
    text: "Die Startseite zeigt eine Zeile pro Modell-Setup und eine Spalte pro Frage. Tipps erscheinen als Flaggen; die Modellbegrundung ist uber das Info-Icon sichtbar."
  },
  {
    label: "Fragenwertung",
    text: "Die Fragenwertung ist vom Match-Ranking getrennt. Jeder richtige Tipp gibt genau 5 Punkte; falsche oder noch offene Tipps geben 0."
  },
  {
    label: "Offizielle Antworten",
    text: "Die Tabelle enthalt eine Zeile mit offiziellen Resultaten. Gruppensieger konnen aus abgeschlossenen Gruppenergebnissen abgeleitet werden; Weltmeister, Halbfinalisten und Top-Torschutzen-Team bleiben bis zur Bekanntgabe offen."
  }
];

export default function GermanAboutPage() {
  return (
    <main className="shell aboutShell">
      <section className="hero compactHero heroCentered">
        <p className="eyebrow">Uber das Projekt</p>
        <h1>Was macht LLM SoccerArena?</h1>
        <p className="heroText">
          LLM SoccerArena ist ein Live-Benchmark, der vergleicht, wie grosse Sprachmodelle die FIFA-Weltmeisterschaft 2026 prognostizieren.
          Er speichert zeitgestempelte Tipps, validiert Modelloutputs, wertet sie gegen offizielle Ergebnisse aus und macht die Methodik im Dashboard sichtbar.
        </p>
      </section>

      <section className="panel aboutIntroPanel">
        <p className="sectionKicker">Kernidee</p>
        <h2>Ein Benchmark, viele Modellkonfigurationen</h2>
        <p>
          Der Benchmark vergleicht vollstandige Prognosekonfigurationen, nicht nur Modellnamen. Eine Zeile kann ein bestimmtes Modell,
          eine Zugriffsbedingung, Prompt-Strategie, einen Prognosehorizont und eine Sample-ID reprasentieren.
        </p>
        <p>
          Die Startseite bleibt mit der Standardansicht "bestes pro Modell" lesbar; benutzerdefinierte Filter zeigen bei Bedarf das vollstandige Setup.
        </p>
      </section>

      <section className="aboutGrid">
        <div className="panel aboutPanel">
          <p className="sectionKicker">Pipeline</p>
          <h2>Was Schritt fur Schritt passiert</h2>
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
          <div className="aboutDefinitionList">
            {methods.map((entry) => (
              <div className="aboutDefinition" key={entry.label}>
                <strong>{entry.label}</strong>
                <p>{entry.text}</p>
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
            Eine hohe Punktzahl bedeutet, dass eine Modellkonfiguration bei bereits ausgewerteten Ergebnissen gut abgeschnitten hat.
            Das beweist kein allgemeines Fussballverstandnis und garantiert keine kunftige Leistung.
          </p>
          <p>
            Rankings konnen sich andern, wenn weitere Spiele gespielt, zusatzliche Horizonte erganzt, offizielle Antworten auf Zusatzfragen bekannt und offene Prognosen bewertet werden.
          </p>
          <p>Die Prognosen sind Forschungsergebnisse. Sie sind keine Wettberatung und keine Empfehlung.</p>
        </div>

        <div className="panel aboutPanel">
          <p className="sectionKicker">Grenzen</p>
          <h2>Was zu beachten ist</h2>
          <div className="aboutDefinitionList">
            <div className="aboutDefinition">
              <strong>Kleine Stichproben am Anfang</strong>
              <p>Zu Turnierbeginn sind viele Wertungen offen, daher konnen Leaderboards instabil sein.</p>
            </div>
            <div className="aboutDefinition">
              <strong>Open-Book-Beobachtbarkeit</strong>
              <p>Suchlaufe werden getrackt, aber Tool-Verhalten hangt von Provider-Support und sichtbaren Tool-Spuren ab.</p>
            </div>
            <div className="aboutDefinition">
              <strong>Fussballunsicherheit</strong>
              <p>Auch gut kalibrierte Prognosen konnen falsch sein, weil Fussball rauschanfallig und torarm ist.</p>
            </div>
          </div>
        </div>
      </section>

      <section className="panel aboutPanel aboutTeamPanel">
        <p className="sectionKicker">Entwicklerteam</p>
        <h2>Projektbeitrage</h2>
        <div className="aboutTeamList">
          <div className="aboutTeamMember">
            <strong>Jonas Schweisthal</strong>
            <p>Doktorand an der LMU Munich & Munich Center for Machine Learning (MCML). Konzeption und Umsetzung von Benchmark-Workflow, Prognoseprotokoll, Scoring-Pipeline, Datenbankarchitektur und Dashboard.</p>
          </div>
          <div className="aboutTeamMember">
            <strong>Jonas Schröder</strong>
            <p>Doktorand an der LMU Munich & Munich Center for Machine Learning (MCML). Konzeption und Umsetzung von Benchmark-Workflow, Prognoseprotokoll, Scoring-Pipeline, Datenbankarchitektur und Dashboard.</p>
          </div>
          <div className="aboutTeamMember">
            <strong>Oliver Müller</strong>
            <p>Wissenschaftlicher Mitarbeiter. Professor fur Data Analytics an der Universitat Paderborn & Head of AI Competence Center des Software Innovation Campus Paderborn (SICP).</p>
          </div>
          <div className="aboutTeamMember">
            <strong>Markus Weinmann</strong>
            <p>Projektleitung. Professor fur Business Analytics an der Universitat zu Koln & Institute for Business AI.</p>
          </div>
          <div className="aboutTeamMember">
            <strong>Stefan Feuerriegel</strong>
            <p>Projektleitung. Professor in AI for Management an der LMU Munich School of Management & Munich Center for Machine Learning (MCML).</p>
          </div>
        </div>
      </section>
    </main>
  );
}
