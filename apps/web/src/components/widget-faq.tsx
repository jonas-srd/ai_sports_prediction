import type { Locale } from "@/lib/i18n";

type FaqEntry = [question: string, answer: string];

const widgetEntriesByLocale: Record<Locale, FaqEntry[]> = {
  de: [
    ["Wie zuverlässig sind Teams, Wettbewerbe, Logos und Flaggen?", "Nur geprüfte Liga-IDs, passende Teams sowie echte API-Logos und Spielerflaggen werden veröffentlicht. Fehlerhafte Spiele werden automatisch ausgeblendet und intern gemeldet."],
    ["Wie aktuell sind die Widgets?", "Spiele und Prognosen werden regelmäßig synchronisiert. Die eingebettete Ansicht lädt die jeweils freigegebenen aktuellen Daten."],
    ["Wie aufwendig ist die Integration?", "Spiel auswählen, Gestaltung festlegen und den erzeugten Embed-Code einfügen. Das dauert normalerweise nur wenige Minuten."],
    ["Kann ich Branding und Modellwahl steuern?", "Je nach Tarif lassen sich Farben, Begründung und Modellwahl konfigurieren. Growth enthält alle Widget-Formate."],
    ["Wie funktionieren Laufzeit und Kündigung?", "Direkttarife haben zwölf Monate Mindestlaufzeit. Danach verlängern sie sich monatlich. Die Kündigung wird im Kundenkonto zum frühesten zulässigen Termin vorgemerkt."],
    ["Wie werden Datenschutz und Ladezeit behandelt?", "Das Widget verarbeitet nur die technisch notwendigen Zugriffs- und Domaininformationen. Inhalte werden kompakt ausgeliefert und ohne unnötige Drittanbieter-Skripte eingebettet."]
  ],
  en: [
    ["How is data quality protected?", "Only verified league IDs, matching teams, real API logos and player flags are published. Invalid matches are hidden and reported internally."],
    ["How current are the widgets?", "Fixtures and predictions are synchronized regularly. Embeds load the latest approved data."],
    ["How much integration work is required?", "Select a match, configure the design and paste the generated embed code. It usually takes only a few minutes."],
    ["Can I control branding and model selection?", "Depending on the plan, colors, reasoning and model selection can be configured. Growth includes every widget format."],
    ["How do term and cancellation work?", "Direct plans have a twelve-month minimum term and then renew monthly. Cancellation is scheduled in the customer account for the earliest permitted date."],
    ["What about privacy and loading time?", "The widget processes only technical access and domain data needed for delivery. It ships compact content without unnecessary third-party scripts."]
  ]
};

const homeEntriesByLocale: Record<Locale, FaqEntry[]> = {
  de: [
    ["Ist Residual Sports für Sportwetten gedacht?", "Nein. Wir stellen ausschließlich Informationen bereit: Modellprognosen, Wahrscheinlichkeiten, Ergebnisideen und nachvollziehbare Begründungen. Das ist keine Wettberatung, keine Aufforderung zum Wetten und keine Garantie für einen bestimmten Ausgang."],
    ["Verwendet ihr ein eigenes Prognosemodell?", "Ja. Unsere eigene Prognose- und Bewertungslogik verbindet Form, Matchup, Spielplan, verfügbare Team- und Spielerdaten sowie situativen Kontext. Daraus entstehen Sieg-Wahrscheinlichkeiten, Ergebnisideen und eine verständliche Begründung."],
    ["Wie testet ihr die Qualität der Prognosen?", "Prognosen werden vor Spielbeginn mit Zeitstempel gespeichert und nach dem Ergebnis ausgewertet. Dafür nutzen wir unter anderem Brier Score, Ergebnisgenauigkeit, Abweichung beim Tor- oder Punkteabstand und weitere Zuverlässigkeitsmetriken."],
    ["Wie vergleicht sich das Modell mit Wettquoten?", "Wenn aktuelle Marktdaten verfügbar sind, übersetzen wir Quoten in implizite Wahrscheinlichkeiten und vergleichen sie mit unseren Modellwerten auf derselben Skala. So wird sichtbar, wo Modell und Markt ähnlich oder unterschiedlich bewerten. Wir behaupten nicht, Wettmärkte dauerhaft zu schlagen, und leiten daraus kein Gewinnversprechen ab."],
    ["Sind die Prognosen sichere Vorhersagen?", "Nein. Sport bleibt unvorhersehbar. Wahrscheinlichkeiten beschreiben mögliche Ausgänge und Unsicherheit, aber keine Gewissheit. Verletzungen, Aufstellungen, Spielsituationen und Zufall können jedes Ergebnis verändern."],
    ["Wie aktuell sind die angezeigten Daten?", "Spiele, Ergebnisse, verfügbare Kontextdaten und Prognosen werden regelmäßig aktualisiert. Der Zeitpunkt und die Datenlage einer Prognose können sich deshalb von späteren Informationen unterscheiden."]
  ],
  en: [
    ["Is Residual Sports intended for sports betting?", "No. We provide information only: model forecasts, probabilities, score ideas and explainable reasoning. This is not betting advice, an invitation to bet or a guarantee of any outcome."],
    ["Do you use your own prediction model?", "Yes. Our proprietary forecasting and evaluation logic combines form, matchup, schedule, available team and player data, and situational context. It produces win probabilities, score ideas and a readable explanation."],
    ["How do you test forecast quality?", "Predictions are timestamped before games and evaluated after results are known. Metrics include Brier score, outcome accuracy, goal or points-margin error, and additional reliability measures."],
    ["How does the model compare with betting odds?", "When current market data is available, we convert odds into implied probabilities and compare them with our model on the same scale. This shows where model and market assessments are similar or different. We do not claim to consistently beat betting markets or promise profits."],
    ["Are the predictions certain?", "No. Sport remains unpredictable. Probabilities describe possible outcomes and uncertainty, not certainty. Injuries, lineups, in-game events and chance can change any result."],
    ["How current is the displayed data?", "Fixtures, results, available context data and predictions are updated regularly. A forecast's timestamp and information set can therefore differ from information that becomes available later."]
  ]
};

export function WidgetFaq({ locale }: { locale: Locale }) {
  return (
    <FaqSection
      entries={widgetEntriesByLocale[locale]}
      id="widget-faq-title"
      title={locale === "de" ? "Häufige Fragen" : "Frequently asked questions"}
    />
  );
}

export function HomeFaq({ locale }: { locale: Locale }) {
  return (
    <FaqSection
      entries={homeEntriesByLocale[locale]}
      id="home-faq-title"
      title={locale === "de" ? "Häufige Fragen zu unseren Prognosen" : "Frequently asked questions about our predictions"}
    />
  );
}

function FaqSection({ entries, id, title }: { entries: FaqEntry[]; id: string; title: string }) {
  return (
    <section className="widgetsPanel widgetsFaq" aria-labelledby={id}>
      <div className="widgetsSectionIntro">
        <p className="footballEyebrow">FAQ</p>
        <h2 id={id}>{title}</h2>
      </div>
      <div>
        {entries.map(([question, answer]) => (
          <details key={question}>
            <summary>{question}</summary>
            <p>{answer}</p>
          </details>
        ))}
      </div>
    </section>
  );
}
