import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "About | LLM SoccerArena",
  description: "Project overview, methodology, scoring, and limitations of LLM SoccerArena."
};

const pipelineSteps = [
  {
    title: "1. Fixtures and metadata",
    text: "The database stores the World Cup 2026 schedule, teams, kickoff times, stages, venues, and later the official 90-minute and full-match results."
  },
  {
    title: "2. Controlled prediction runs",
    text: "Each model predicts under defined conditions: forecast horizon, access mode, prompt strategy, and sample id. This compares setups, not just model names."
  },
  {
    title: "3. Output validation",
    text: "Responses are parsed, normalized where possible, and checked for valid probabilities, valid scorelines, required fields, and scoring eligibility."
  },
  {
    title: "4. Result evaluation",
    text: "Once real outcomes are known, match predictions receive football-style scores and benchmark metrics such as Brier score, log loss, and accuracy flags."
  },
  {
    title: "5. Public dashboard",
    text: "The website aggregates the data into the Home ranking, Question predictions table, match schedule, tournament tree, and analytics views."
  }
];

const methods = [
  {
    label: "Forecast horizons",
    text: "A horizon records when a prediction was made, for example at stage opening, 24 hours before kickoff, or 2 hours before kickoff."
  },
  {
    label: "Closed book",
    text: "The model receives fixture-identifying information only and must not use web search, external tools, odds, news, lineups, or curated current data."
  },
  {
    label: "Open book",
    text: "The model may use configured search/tool access before answering. This tests whether current public information improves forecasts."
  },
  {
    label: "Direct score",
    text: "The prompt asks for the most likely scoreline while still requiring probabilities for home win, draw, away win, and knockout advancement where relevant."
  },
  {
    label: "Probabilistic forecast",
    text: "The prompt emphasizes calibrated probabilities first, then reports the likely scoreline. This tests whether probability-first reasoning changes performance."
  },
  {
    label: "Best per model",
    text: "The default Home view selects each model's best-performing setup for readability. Custom filters can instead show all or selected configurations."
  }
];

const metrics = [
  {
    label: "Match scores",
    text: "Exact 90-minute score receives 5 points, correct goal difference receives 2, correct tendency receives 1, and misses receive 0."
  },
  {
    label: "Brier score",
    text: "Measures probabilistic calibration for match outcome probabilities. Lower is better."
  },
  {
    label: "Log loss",
    text: "Penalizes confident probability forecasts that assign low probability to the actual result. Lower is better."
  },
  {
    label: "Accuracy flags",
    text: "Track exact score accuracy, goal-difference accuracy, tendency accuracy, top-outcome accuracy, and knockout advancement accuracy."
  },
  {
    label: "Reliability metrics",
    text: "Track invalid outputs, repaired outputs, normalization, tool usage compliance, and consistency between scoreline and probability argmax."
  }
];

const questionMethods = [
  {
    label: "Special questions",
    text: "Models also answer 15 tournament-long questions: 12 group winners, semifinalists, the team of the top scorer, and the world champion."
  },
  {
    label: "Question display",
    text: "The Home table shows one row per model setup and one column per question. Picks are rendered as flags, with model reasoning available through the info icon."
  },
  {
    label: "Question scoring",
    text: "Question ranking is separate from match ranking. Each correct question tip gives exactly 5 points; wrong or unresolved tips give 0."
  },
  {
    label: "Actual answers",
    text: "The table includes an official-results row. Group winners can be derived from completed group results; champion, semifinalists, and top-scorer team remain pending until known."
  }
];

export default function AboutPage() {
  return (
    <main className="shell aboutShell">
      <section className="hero compactHero heroCentered">
        <p className="eyebrow">About the project</p>
        <h1>What does LLM SoccerArena do?</h1>
        <p className="heroText">
          LLM SoccerArena is a live benchmark for comparing how large language models forecast the FIFA World Cup 2026.
          It stores timestamped predictions, validates model outputs, evaluates them against official results, and makes the methods visible in the dashboard.
        </p>
      </section>

      <section className="panel aboutIntroPanel">
        <p className="sectionKicker">Core idea</p>
        <h2>One benchmark, many model configurations</h2>
        <p>
          The benchmark compares complete prediction configurations, not just model names. A row can represent a specific model,
          access condition, prompt strategy, forecast horizon, and sample id. This makes it possible to ask whether search access,
          probabilistic prompting, or timing changes forecasting quality.
        </p>
        <p>
          The public Home page keeps this readable with a default best-per-model view, while custom filters expose the full benchmark setup.
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
          <h2>How match predictions differ</h2>
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
          <p className="sectionKicker">Extra questions</p>
          <h2>Tournament-long forecasts</h2>
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
      </section>

      <section className="aboutGrid">
        <div className="panel aboutPanel aboutCautionPanel">
          <p className="sectionKicker">Interpretation</p>
          <h2>What the ranking means</h2>
          <p>
            A high score means that a model configuration performed well on outcomes that have already been evaluated.
            It does not prove general football understanding, and it does not guarantee future performance.
          </p>
          <p>
            Rankings can change as more matches are played, more horizons are added, actual special-question answers become known,
            and previously pending predictions receive official scores.
          </p>
          <p>
            The forecasts are research outputs. They are not betting advice and should not be treated as recommendations.
          </p>
        </div>

        <div className="panel aboutPanel">
          <p className="sectionKicker">Limitations</p>
          <h2>What to keep in mind</h2>
          <div className="aboutDefinitionList">
            <div className="aboutDefinition">
              <strong>Small samples early on</strong>
              <p>At the start of the tournament many scores are pending, so leaderboards can be unstable.</p>
            </div>
            <div className="aboutDefinition">
              <strong>Open-book observability</strong>
              <p>Search-enabled runs are tracked, but tool behavior depends on provider support and observable tool traces.</p>
            </div>
            <div className="aboutDefinition">
              <strong>Football uncertainty</strong>
              <p>Even well-calibrated forecasts can be wrong because football outcomes are noisy and low scoring.</p>
            </div>
          </div>
        </div>
      </section>

      <section className="panel aboutIntroPanel">
        <p className="sectionKicker">Project team</p>
        <h2>Designed and built by researchers</h2>
        <p>
          LLM SoccerArena was designed and built by Jonas Schweisthal and Jonas Schröder, PhD researchers at the Chair of Prof. Feuerriegel.
        </p>
        <p>
          The project team designed the benchmark workflow, prediction protocol, scoring pipeline, database architecture, and public dashboard
          for comparing LLM forecasts of the FIFA World Cup 2026.
        </p>
      </section>
    </main>
  );
}
