import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Info | AI Sport Prediction",
  description: "Über die AI-Sport-Prediction-Plattform für Fußball, NFL, NBA und Tennis."
};

const sports = [
  {
    title: "Fußball",
    text: "Spielausgang, exakte Ergebnisse, xG-Kontext, Teamform und Turnierpfad-Simulationen."
  },
  {
    title: "NFL",
    text: "Siegwahrscheinlichkeit, Spread-Sensitivität, Teamstärke, Verletzungen, Spielplan und Playoff-Pfade."
  },
  {
    title: "NBA",
    text: "Rest Days, Travel, Rotationen, Spieler-Verfügbarkeit, Pace und Effizienzsignale für Matchup Nights."
  },
  {
    title: "Tennis",
    text: "Belagsspezifische Prognosen mit Serve-/Return-Splits, Draw-Kontext und Matchformat."
  }
];

const process = [
  {
    title: "1. Signale sammeln",
    text: "Fixtures, Teams, historische Performance, Form, Verletzungen und sportartspezifischer Kontext werden normalisiert."
  },
  {
    title: "2. Modelle laufen lassen",
    text: "Mehrere Modell-Setups erzeugen strukturierte Prognosen, Konfidenzwerte und Reasoning-Metadaten."
  },
  {
    title: "3. Forecasts vergleichen",
    text: "Die Plattform bündelt Modelltipps zu Consensus Views, Upset Alerts und Reliability Scores."
  },
  {
    title: "4. Ergebnisse prüfen",
    text: "Vorhersagen werden gegen offizielle Ergebnisse geprüft, damit Genauigkeit transparent messbar bleibt."
  }
];

const principles = [
  "Vorhersagen werden als Wahrscheinlichkeiten gezeigt, nicht als Sicherheiten.",
  "Modellleistung wird erst nach offiziellen Ergebnissen bewertet.",
  "Jede Sportart bekommt eigene Signale statt einer generischen Formel für alles.",
  "Das Produkt ist zuerst als stabile Datenplattform gebaut: Postgres, Queue Worker, Backups und Restore-Checks."
];

export default function GermanAboutPage() {
  return (
    <main className="shell aboutShell">
      <section className="hero compactHero heroCentered">
        <p className="eyebrow">Über die Plattform</p>
        <h1>AI Sport Prediction</h1>
        <p className="heroText">
          Eine Multi-Sport-KI-Plattform für Fußball, NFL, NBA und Tennis. Ziel ist, Modellprognosen
          verständlich, vergleichbar und überprüfbar zu machen.
        </p>
      </section>

      <section className="sportsHubSection">
        <div className="sectionHeaderRow">
          <div>
            <p className="sectionKicker">Sportarten</p>
            <h2>Vier Sportarten, eine Prediction-Schicht</h2>
          </div>
          <p>
            AI Sport Prediction startet mit Fußball und wird um die Sportarten erweitert, bei denen
            Modellsignale, Spielpläne und Ergebnisvalidierung ein nützliches Daily Product ergeben.
          </p>
        </div>
        <div className="sportCardsGrid">
          {sports.map((sport) => (
            <article className="sportCard" key={sport.title}>
              <div className="sportCardTop">
                <span className="sportTag">{sport.title}</span>
                <span className="sportStatus">Modul</span>
              </div>
              <h3>{sport.title}</h3>
              <p>{sport.text}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="signalSection">
        <div className="sectionHeaderRow">
          <div>
            <p className="sectionKicker">Methode</p>
            <h2>Wie Forecasts zum Produkt werden</h2>
          </div>
          <p>
            Die Plattform ist auf strukturierte Inputs, wiederholbare Modellläufe und transparente
            Auswertung ausgelegt.
          </p>
        </div>
        <div className="signalGrid">
          {process.map((step) => (
            <article className="signalCard" key={step.title}>
              <span />
              <h3>{step.title}</h3>
              <p>{step.text}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="panel aboutIntroPanel">
        <p className="sectionKicker">Prinzipien</p>
        <h2>Erst Vertrauen, dann Skalierung</h2>
        <ul className="sportFeatureList">
          {principles.map((principle) => (
            <li key={principle}>{principle}</li>
          ))}
        </ul>
      </section>
    </main>
  );
}
