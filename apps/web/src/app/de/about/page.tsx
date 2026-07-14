import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Info | AI Sports Prediction",
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
    text: "Erholungstage, Reisen, Rotationen, Spieler-Verfügbarkeit, Tempo und Effizienzsignale für NBA-Abende."
  },
  {
    title: "Tennis",
    text: "Belagsspezifische Prognosen mit Serve-/Return-Splits, Draw-Kontext und Matchformat."
  }
];

const process = [
  {
    title: "1. Signale sammeln",
    text: "Spiele, Teams, historische Leistung, Form, Verletzungen und sportartspezifischer Kontext werden normalisiert."
  },
  {
    title: "2. Modelle laufen lassen",
    text: "Mehrere Modell-Setups erzeugen strukturierte Prognosen, Konfidenzwerte und Begründungsdaten."
  },
  {
    title: "3. Prognosen vergleichen",
    text: "Die Plattform bündelt Modelltipps zu Konsensansichten, Upset-Hinweisen und Zuverlässigkeitswerten."
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
  "Das Produkt ist zuerst als stabile Datenplattform gebaut: Postgres, Warteschlangen, Backups und Wiederherstellungsprüfungen."
];

export default function GermanAboutPage() {
  return (
    <main className="shell aboutShell">
      <section className="hero compactHero heroCentered">
        <p className="eyebrow">Über die Plattform</p>
        <h1>AI Sports Prediction</h1>
        <p className="heroText">
          Eine Multi-Sport-KI-Plattform für Fußball, NFL, NBA und Tennis. Ziel ist, Modellprognosen
          verständlich, vergleichbar und überprüfbar zu machen.
        </p>
      </section>

      <section className="sportsHubSection">
        <div className="sectionHeaderRow">
          <div>
            <p className="sectionKicker">Sportarten</p>
            <h2>Vier Sportarten, eine Prognoseschicht</h2>
          </div>
          <p>
            AI Sports Prediction startet mit Fußball und wird um die Sportarten erweitert, bei denen
            Modellsignale, Spielpläne und Ergebnisvalidierung ein nützliches tägliches Produkt ergeben.
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
            <h2>Wie Prognosen zum Produkt werden</h2>
          </div>
          <p>
            Die Plattform ist auf strukturierte Eingaben, wiederholbare Modellläufe und transparente
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
