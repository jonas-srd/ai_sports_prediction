import type { Metadata } from "next";

import { ObfuscatedEmail } from "@/components/obfuscated-email";

export const metadata: Metadata = {
  title: "Info | AI Sports Prediction",
  description: "Projektüberblick, Methodik, Wertung und Grenzen von AI Sports Prediction."
};

type AboutEntry = {
  label: string;
  text: string;
};

type AboutNestedBranch = AboutEntry & {
  choices: AboutEntry[];
};

type AboutDesignGroup =
  | {
      title: string;
      entries: AboutEntry[];
    }
  | {
      title: string;
      branches: AboutNestedBranch[];
    };

const aboutPoints = [
  {
    label: "Worum es geht",
    text: "AI Sports Prediction ist ein Live-Benchmark und Tippspiel für künstliche Intelligenzen. Während der FIFA-Weltmeisterschaft 2026 sagen führende KI-Sprachmodelle Spiele und Turnierausgänge voraus, und wir vergleichen diese Prognosen mit den offiziellen Ergebnissen."
  },
  {
    label: "Die Frage",
    text: "KI-Chatbots klingen bei fast allem selbstsicher. Fußball ist ein harter öffentlicher Test: Die Spiele stehen fest, die Ergebnisse sind eindeutig, und niemand kennt den Ausgang vorher. Wir fragen, ob Sprachmodelle Fußball prognostizieren können und ob Live-Webzugriff hilft."
  },
  {
    label: "Was die Seite zeigt",
    text: "Das Dashboard zeigt Modell-Ranglisten, jeden Tipp pro Spiel, turnierweite Zusatzfragen, den Turnierbaum, den Spielplan und detaillierte Analysen für verschiedene Modell-Setups."
  },
  {
    label: "Was das Ranking bedeutet",
    text: "Eine hohe Platzierung bedeutet, dass ein Modell-Setup bei den bisher gewerteten Spielen gut abgeschnitten hat. Sie beweist kein Fußballverständnis und garantiert nicht den Ausgang des nächsten Spiels."
  }
];

const pipelineSteps = [
  {
    title: "1. Vor einem Spiel",
    text: "Jedes Modell-Setup sagt das wahrscheinlichste 90-Minuten-Ergebnis, Ergebniswahrscheinlichkeiten, erwartete Tore, Full-Match-Wahrscheinlichkeiten und bei K.-o.-Spielen Weiterkommenswahrscheinlichkeiten voraus."
  },
  {
    title: "2. Zeitstempel und Speicherung",
    text: "Vorhersagen werden mit Prompt, Rohantwort, Run-ID, Spiel-ID, Zeitmetadaten, Modell-ID, Zugriffsbedingung, Prompt-Strategie, Prognosehorizont und Sample-ID gespeichert."
  },
  {
    title: "3. Validierung",
    text: "Antworten müssen gültiges JSON mit Pflichtfeldern enthalten, Wahrscheinlichkeiten im erlaubten Bereich haben, Wahrscheinlichkeitsvektoren müssen innerhalb der Toleranz zu 1 summieren, und Ergebnis-Tipps müssen nichtnegative ganze Zahlen sein."
  },
  {
    title: "4. Auswertung",
    text: "Sobald offizielle Ergebnisse vorliegen, berechnet das System Match-Punkte sowie probabilistische, kategoriale, Ergebnis- und Zuverlässigkeitsmetriken."
  }
];

const researchQuestions = [
  "Wie genau sagen verschiedene Modelle WM-2026-Spiele voraus?",
  "Verbessert Open-Book-Webzugriff die Prognosen gegenüber Closed Book?",
  "Verbessert probabilistisches Prompting die Prognosen gegenüber direktem Ergebnis-Prompting?",
  "Wie oft erzeugen Modelle gültige, nutzbare und in sich stimmige Vorhersagen?",
  "Wie gut sagen Modelle in K.-o.-Spielen vorher, welches Team weiterkommt?"
];

const designGroups: AboutDesignGroup[] = [
  {
    title: "Versuchsdesign",
    entries: [
      {
        label: "2x2-Benchmark",
        text: "Das Kerndesign kreuzt zwei Zugriffsbedingungen, Closed Book und Open Book, mit zwei Prompt-Strategien, Direct Score und Probabilistic Forecast."
      },
      {
        label: "Versuchseinheit",
        text: "Die Einheit ist Modell x Spiel x Prognosehorizont x Zugriffsbedingung x Prompt-Strategie x Sample-ID. Der Kern-Benchmark nutzt einen deterministischen Aufruf pro Einheit."
      },
      {
        label: "Modell-Setups",
        text: "Die Website unterscheidet vollständige Setups, nicht nur Modellnamen. Dadurch bleiben Open Book, Closed Book, Direct Score, Probabilistic Forecast und verschiedene Horizonte getrennt sichtbar."
      }
    ]
  },
  {
    title: "Prognosezeitpunkt",
    entries: [
      {
        label: "T-24h",
        text: "Vorhersagen rund 24 Stunden vor dem Anpfiff. Primäre Analysen können auf gültige T-24h-Vorhersagen beschränkt werden."
      },
      {
        label: "T-2h",
        text: "Vorhersagen rund zwei Stunden vor dem Anpfiff. Dieser Horizont ist operativ fragiler, kann bei Open Book aber spätere öffentliche Informationen einbeziehen."
      },
      {
        label: "STAGE_OPENING",
        text: "Gruppenspiele werden einmal zum Phasenbeginn vorhergesagt; K.-o.-Spiele werden vorhergesagt, sobald die Paarung bekannt ist. Diese Vorhersagen ersetzen keine fehlenden T-24h-Vorhersagen."
      }
    ]
  },
  {
    title: "Informationszugriff und Prompts",
    branches: [
      {
        label: "Informationszugriff",
        text: "Pro Vorhersagelauf wird genau eine Zugriffsbedingung verwendet.",
        choices: [
          {
            label: "Closed Book",
            text: "Nur spielidentifizierende Felder; keine Websuche, Tools, Quoten, Nachrichten, Form, Ranglisten, Verletzungen oder Aufstellungen."
          },
          {
            label: "Open Book",
            text: "Derselbe Spielblock plus konfigurierte Websuche/Tool-Zugriff und die Anweisung, aktuelle öffentliche Informationen abzurufen."
          }
        ]
      },
      {
        label: "Prompt-Strategie",
        text: "Genau eine Prompt-Strategie wird mit der Zugriffsbedingung kombiniert.",
        choices: [
          {
            label: "Direct Score",
            text: "Zuerst das wahrscheinlichste Ergebnis nennen, danach dazu konsistente Wahrscheinlichkeiten angeben."
          },
          {
            label: "Probabilistic Forecast",
            text: "Zuerst kalibrierte Wahrscheinlichkeiten und erwartete Tore schätzen, danach das Ergebnis ableiten."
          }
        ]
      }
    ]
  }
];

const metrics = [
  {
    label: "Tippspiel-Punkte",
    text: "Exaktes 90-Minuten-Ergebnis gibt 5 Punkte, richtige Tordifferenz 2, richtige Tendenz 1 und ein Fehltipp 0."
  },
  {
    label: "Wahrscheinlichkeitsmetriken",
    text: "Der Benchmark berichtet den 90-Minuten-Multiklassen-Brier-Score und den Multiklassen-Log-Loss. Niedriger ist jeweils besser."
  },
  {
    label: "Genauigkeitsmetriken",
    text: "Wir messen Top-Outcome-Genauigkeit, Tendenz-Genauigkeit aus dem Ergebnis-Tipp, exakte Ergebnisgenauigkeit, Tordifferenz-Genauigkeit und Weiterkommensgenauigkeit."
  },
  {
    label: "Zuverlässigkeitsdiagnostik",
    text: "Wir berichten Raten für ungültige, reparierte, normalisierte und fehlende Vorhersagen sowie Open-Book-Suchbeobachtung und Ergebnis-Wahrscheinlichkeits-Konsistenz."
  },
  {
    label: "Turnierweite Fragen",
    text: "Jedes Modell-Setup beantwortet 15 turnierweite Fragen. Diese werden getrennt von Match-Prognosen gewertet, mit 5 Punkten pro richtiger Antwort."
  }
];

const activeModels = [
  "GPT-5.5",
  "Claude Opus 4.8",
  "Claude Fable 5",
  "Gemini 3.1 Pro",
  "Grok 4.3",
  "DeepSeek V4 Pro",
  "Qwen 3.7 Max",
  "Mistral Large 2512"
];

const limitations = [
  "Ein einzelnes Turnier ist eine kleine Stichprobe, besonders am Anfang.",
  "Neuere Modelle können auch ohne Websuche mehr aktuelle öffentliche Informationen kennen.",
  "Open-Book-Modelle können öffentliche Quoten oder Marktberichte lesen; deshalb müssen Open-Book-Ergebnisse vorsichtig interpretiert werden.",
  "K.-o.-Spiele nach Verlängerung und Elfmeterschießen brauchen separate Weiterkommensmetriken.",
  "Fußball ist verrauscht und torarm, deshalb liegen auch gut kalibrierte Prognosen oft daneben."
];

export default function GermanAboutPage() {
  return (
    <main className="shell aboutShell">
      <section className="hero compactHero heroCentered">
        <p className="eyebrow">Über das Projekt</p>
        <h1>AI Sports Prediction</h1>
        <p className="heroText">
          Ein live laufender, zeitgestempelter Benchmark dafür, wie große Sprachmodelle die FIFA-Weltmeisterschaft 2026 vorhersagen.
        </p>
      </section>

      <nav className="aboutAnchorNav" aria-label="Abschnitte der Infoseite">
        <a href="#about">Über AI Sports Prediction</a>
        <a href="#methodology">Methodik</a>
        <a href="#team">Team</a>
      </nav>

      <header className="aboutSectionHeader" id="about">
        <p className="sectionKicker">Abschnitt 1</p>
        <h2>Über AI Sports Prediction</h2>
        <p>Was das Projekt ist, was das Dashboard zeigt und wie das Ranking zu lesen ist.</p>
      </header>

      <section className="panel aboutIntroPanel">
        <p className="sectionKicker">Überblick</p>
        <h2>Was dieser Benchmark macht</h2>
        <p>
          Man kann es sich wie ein Tippspiel vorstellen, bei dem die Spieler GPT-5.5, Claude,
          Gemini, Grok, DeepSeek, Qwen, Mistral und andere Modell-Setups sind. Die Prognosen
          sind Forschungsergebnisse und öffentliche Benchmark-Daten, keine Wettempfehlungen.
        </p>
      </section>

      <section className="aboutGrid">
        {aboutPoints.map((entry) => (
          <div className="panel aboutPanel" key={entry.label}>
            <p className="sectionKicker">{entry.label}</p>
            <p>{entry.text}</p>
          </div>
        ))}
      </section>

      <header className="aboutSectionHeader" id="methodology">
        <p className="sectionKicker">Abschnitt 2</p>
        <h2>Methodik</h2>
        <p>Wie Vorhersagen erzeugt, validiert, bewertet und nach Setup getrennt werden.</p>
      </header>

      <section className="panel aboutPanel aboutMethodologyPanel">
        <p className="sectionKicker">Pipeline</p>
        <h2>Wie der Benchmark funktioniert</h2>
        <div className="aboutStepList">
          {pipelineSteps.map((step) => (
            <div className="aboutStep" key={step.title}>
              <strong>{step.title}</strong>
              <p>{step.text}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="aboutGrid">
        <div className="panel aboutPanel">
          <p className="sectionKicker">Forschungsfragen</p>
          <h2>Was wir testen</h2>
          <ul className="aboutBulletList">
            {researchQuestions.map((question) => (
              <li key={question}>{question}</li>
            ))}
          </ul>
        </div>

        <div className="panel aboutPanel">
          <p className="sectionKicker">Modelle</p>
          <h2>Aktives Flaggschiff-Set</h2>
          <p>
            Der aktive 2x2-Vergleich läuft über OpenRouter. Das genaue Set kann sich mit
            der Modellverfügbarkeit ändern; aktuell umfasst es:
          </p>
          <div className="aboutPillList">
            {activeModels.map((model) => (
              <span key={model}>{model}</span>
            ))}
          </div>
        </div>
      </section>

      <section className="aboutStack">
        {designGroups.map((group) => (
          <div className="panel aboutPanel" key={group.title}>
            <p className="sectionKicker">Methodik</p>
            <h2>{group.title}</h2>
            {"branches" in group ? (
              <div className="aboutNestedSetup">
                <div className="aboutNestedRoot">Ein Modell-Setup</div>
                {group.branches.map((branch) => (
                  <div className="aboutNestedBranch" key={branch.label}>
                    <div className="aboutNestedBranchHeader">
                      <strong>{branch.label}</strong>
                      <p>{branch.text}</p>
                    </div>
                    <div className="aboutNestedChoices">
                      {branch.choices.map((choice) => (
                        <div className="aboutNestedChoice" key={choice.label}>
                          <strong>{choice.label}</strong>
                          <p>{choice.text}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="aboutDefinitionList">
                {group.entries.map((entry) => (
                  <div className="aboutDefinition" key={entry.label}>
                    <strong>{entry.label}</strong>
                    <p>{entry.text}</p>
                  </div>
                ))}
              </div>
            )}
          </div>
        ))}
      </section>

      <section className="aboutGrid">
        <div className="panel aboutPanel">
          <p className="sectionKicker">Auswertung</p>
          <h2>Scoring und Metriken</h2>
          <div className="aboutDefinitionList">
            {metrics.map((entry) => (
              <div className="aboutDefinition" key={entry.label}>
                <strong>{entry.label}</strong>
                <p>{entry.text}</p>
              </div>
            ))}
          </div>
        </div>

        <div className="panel aboutPanel aboutCautionPanel">
          <p className="sectionKicker">Grenzen</p>
          <h2>Wie das Ranking zu lesen ist</h2>
          <ul className="aboutBulletList">
            {limitations.map((limitation) => (
              <li key={limitation}>{limitation}</li>
            ))}
          </ul>
          <p>
            Rankings verschieben sich, wenn mehr Spiele gewertet werden, weitere Horizonte
            hinzukommen und offene turnierweite Antworten aufgelöst werden.
          </p>
        </div>
      </section>

      <header className="aboutSectionHeader" id="team">
        <p className="sectionKicker">Abschnitt 3</p>
        <h2>Team</h2>
        <p>Die Forschenden und Beitragenden hinter AI Sports Prediction.</p>
      </header>

      <section className="panel aboutPanel aboutTeamPanel">
        <p className="sectionKicker">Personen</p>
        <h2>Wer dahintersteht</h2>
        <div className="aboutTeamList">
          <div className="aboutTeamMember">
            <strong>Jonas Schweisthal</strong>
            <p>Doktorand an der LMU München und am Munich Center for Machine Learning (MCML).</p>
            <ObfuscatedEmail reversedDomain="ed.uml" reversedLocalPart="lahtsiewhcs.sanoj" />
          </div>
          <div className="aboutTeamMember">
            <strong>Jonas Schröder</strong>
            <p>Doktorand an der LMU München und am Munich Center for Machine Learning (MCML).</p>
            <ObfuscatedEmail reversedDomain="ed.uml" reversedLocalPart="redeorhcs.sanoj" />
          </div>
          <div className="aboutTeamMember">
            <strong>Oliver Müller</strong>
            <p>Professor für Data Analytics an der Universität Paderborn und Leiter des AI Competence Center am SICP.</p>
          </div>
          <div className="aboutTeamMember">
            <strong>Markus Weinmann</strong>
            <p>Professor für Business Analytics an der Universität zu Köln und am Institute for Business AI.</p>
          </div>
          <div className="aboutTeamMember">
            <strong>Stefan Feuerriegel</strong>
            <p>Professor für AI for Management an der LMU Munich School of Management und am MCML.</p>
            <ObfuscatedEmail reversedDomain="ed.uml" reversedLocalPart="legeirreuef" />
          </div>
        </div>
      </section>

      <section className="panel aboutPanel aboutResearchPanel">
        <p className="sectionKicker">Research Paper</p>
        <h2>AI Sports Prediction Paper</h2>
        <a className="aboutPdfBox" href="/research-paper.pdf" target="_blank" rel="noreferrer">
          <span>PDF</span>
          <strong>Paper öffnen</strong>
          <p>Das vollständige Paper wird hier als PDF verfügbar sein.</p>
        </a>
      </section>
    </main>
  );
}
