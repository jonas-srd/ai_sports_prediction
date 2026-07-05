import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "About | AI Sport Prediction",
  description: "About the AI Sport Prediction platform for football, NFL, NBA and tennis forecasts."
};

const sports = [
  {
    title: "Football",
    text: "Match result forecasts, exact-score picks, xG context, team form and tournament-path simulations."
  },
  {
    title: "NFL",
    text: "Win probability, spread sensitivity, team strength, injuries, schedules and playoff paths."
  },
  {
    title: "NBA",
    text: "Rest, travel, rotations, player availability, pace and efficiency signals for matchup nights."
  },
  {
    title: "Tennis",
    text: "Surface-aware forecasts with serve and return splits, draw context and match-format handling."
  }
];

const process = [
  {
    title: "1. Collect signals",
    text: "Fixtures, teams, historical performance, form, injuries and sport-specific context are normalized before prediction."
  },
  {
    title: "2. Run models",
    text: "Multiple model setups produce structured forecasts, confidence values and reasoning metadata."
  },
  {
    title: "3. Compare forecasts",
    text: "The platform groups model picks into consensus views, upset alerts and reliability scores."
  },
  {
    title: "4. Score results",
    text: "Predictions are checked against official results so accuracy can be tracked transparently over time."
  }
];

const principles = [
  "Predictions are shown as probabilities, not certainties.",
  "Model performance is measured after official results are available.",
  "Each sport has its own signals instead of forcing one generic formula onto every matchup.",
  "The product is built as a data platform first: Postgres, queue workers, backups and restore checks."
];

export default function AboutPage() {
  return (
    <main className="shell aboutShell">
      <section className="hero compactHero heroCentered">
        <p className="eyebrow">About the platform</p>
        <h1>AI Sport Prediction</h1>
        <p className="heroText">
          A multi-sport AI prediction platform for football, NFL, NBA and tennis. The goal is to make
          model forecasts understandable, comparable and verifiable.
        </p>
      </section>

      <section className="sportsHubSection">
        <div className="sectionHeaderRow">
          <div>
            <p className="sectionKicker">Sports</p>
            <h2>Four sports, one prediction layer</h2>
          </div>
          <p>
            AI Sport Prediction starts with football and expands into the sports where model signals,
            schedules and result validation can create a useful daily product.
          </p>
        </div>
        <div className="sportCardsGrid">
          {sports.map((sport) => (
            <article className="sportCard" key={sport.title}>
              <div className="sportCardTop">
                <span className="sportTag">{sport.title}</span>
                <span className="sportStatus">Module</span>
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
            <p className="sectionKicker">Method</p>
            <h2>How forecasts become a product</h2>
          </div>
          <p>
            The platform is designed around structured inputs, repeatable model runs and transparent
            scoring instead of one-off predictions.
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
        <p className="sectionKicker">Principles</p>
        <h2>Built for trust before scale</h2>
        <ul className="sportFeatureList">
          {principles.map((principle) => (
            <li key={principle}>{principle}</li>
          ))}
        </ul>
      </section>
    </main>
  );
}
