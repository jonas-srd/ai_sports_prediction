import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "About | LLM SoccerArena",
  description: "Project overview, methodology, scoring, and limitations of LLM SoccerArena."
};

const pipelineSteps = [
  {
    title: "1. Match schedule",
    text: "The system starts from the World Cup fixture database: teams, kickoff times, tournament stage, venue, and later the official result."
  },
  {
    title: "2. Model predictions",
    text: "Several LLM configurations generate forecasts for each match. A configuration combines the model, forecast horizon, access mode, and prompt strategy."
  },
  {
    title: "3. Validation",
    text: "Every model output is parsed and checked. Invalid JSON, missing probabilities, impossible scores, or inconsistent outputs are flagged before scoring."
  },
  {
    title: "4. Evaluation",
    text: "After the match result is known, predictions receive scores and additional benchmark metrics such as Brier score and log loss."
  },
  {
    title: "5. Dashboard",
    text: "The website aggregates all predictions into the leaderboard, match schedule, tournament tree, and analytics views."
  }
];

const methods = [
  {
    label: "Forecast horizons",
    text: "Predictions can be generated at different times, for example at stage opening, 24 hours before kickoff, or 1 hour before kickoff."
  },
  {
    label: "Closed book",
    text: "The model predicts from internal knowledge only. No search or external tools are allowed."
  },
  {
    label: "Open book",
    text: "The model may use configured search or tool access before answering. This tests whether current information improves forecasts."
  },
  {
    label: "Direct score",
    text: "The prompt asks directly for the most likely scoreline, while still requiring probabilities for the main outcomes."
  },
  {
    label: "Probabilistic forecast",
    text: "The prompt emphasizes calibrated probabilities first, then derives or reports the likely scoreline."
  }
];

const metrics = [
  {
    label: "Scores",
    text: "A human-readable football prediction score. Exact results receive the highest scores, correct tendencies receive lower scores."
  },
  {
    label: "Brier score",
    text: "Measures how well predicted probabilities match the actual outcome. Lower is better."
  },
  {
    label: "Log loss",
    text: "Penalizes confident but wrong probability forecasts. Lower is better."
  },
  {
    label: "Accuracy metrics",
    text: "Track whether the model predicted the correct winner/draw, exact score, goal difference, or advancement outcome."
  }
];

export default function AboutPage() {
  return (
    <main className="shell aboutShell">
      <section className="hero compactHero heroCentered">
        <p className="eyebrow">About the project</p>
        <h1>What does LLM SoccerArena do?</h1>
        <p className="heroText">
          LLM SoccerArena is an experimental benchmark for comparing how well large language models forecast football matches.
          It asks different models to predict World Cup games, stores their forecasts, validates the outputs, and evaluates them once real results are available.
        </p>
      </section>

      <section className="panel aboutIntroPanel">
        <p className="sectionKicker">Core idea</p>
        <h2>One benchmark, many model configurations</h2>
        <p>
          The project does not only compare model names. It compares complete prediction setups:
          which model was used, when the prediction was made, whether the model had search access,
          and which prompt strategy was used. This makes the ranking more transparent than a single
          flat leaderboard.
        </p>
      </section>

      <section className="aboutGrid">
        <div className="panel aboutPanel">
          <p className="sectionKicker">Pipeline</p>
          <h2>What happens step by step</h2>
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
          <p className="sectionKicker">Methods</p>
          <h2>How predictions differ</h2>
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
          <p className="sectionKicker">Evaluation</p>
          <h2>How forecasts are scored</h2>
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
          <p className="sectionKicker">Interpretation</p>
          <h2>What the ranking means</h2>
          <p>
            A high score means that a model configuration performed well on the evaluated matches so far.
            It does not prove that the model understands football perfectly, and it does not guarantee future performance.
          </p>
          <p>
            Results can change as more matches are played, more horizons are added, and more predictions receive official evaluation scores.
          </p>
          <p>
            The forecasts are research outputs. They are not betting advice and should not be treated as recommendations.
          </p>
        </div>
      </section>
    </main>
  );
}
