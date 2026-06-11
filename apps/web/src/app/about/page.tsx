import type { Metadata } from "next";

import { ObfuscatedEmail } from "@/components/obfuscated-email";

export const metadata: Metadata = {
  title: "About | LLM SoccerArena",
  description: "Project overview, methodology, scoring, and limitations of LLM SoccerArena."
};

const pipelineSteps = [
  {
    title: "1. Fixtures and metadata",
    text: "We keep the World Cup 2026 schedule, teams, kickoff times, stages, venues, and official results in one place."
  },
  {
    title: "2. Prediction runs",
    text: "Each model predicts under a clearly named setup: timing, information access, prompt style, and sample id."
  },
  {
    title: "3. Output checks",
    text: "We check whether the answer can be read cleanly: valid scoreline, valid probabilities, required fields, and enough information for scoring."
  },
  {
    title: "4. Scoring",
    text: "When a match is finished, predictions receive simple match points plus extra probability and accuracy metrics."
  },
  {
    title: "5. Public dashboard",
    text: "The site turns the raw predictions into rankings, match views, question tables, the tournament tree, and analytics."
  }
];

const methodGroups = [
  {
    title: "Timing",
    intro: "The same match can be predicted at different moments, because the available context changes as kickoff gets closer.",
    entries: [
      {
        label: "Forecast horizons",
        text: "A horizon says when the prediction was made: for example at stage opening, 24 hours before kickoff, or 2 hours before kickoff."
      }
    ]
  },
  {
    title: "Information access",
    intro: "Some runs are intentionally isolated; others can look up current public information before answering.",
    entries: [
      {
        label: "Closed book",
        text: "The model only gets the fixture details. It should not use search, tools, odds, news, lineups, or other fresh outside context."
      },
      {
        label: "Open book",
        text: "The model may use configured search or tool access. This shows whether current public information helps the forecast."
      }
    ]
  },
  {
    title: "Answer style",
    intro: "We vary the prompt to see whether models behave differently when they think in scorelines first or probabilities first.",
    entries: [
      {
        label: "Direct score",
        text: "The model starts with the most likely scoreline and also gives win, draw, loss, and knockout probabilities where needed."
      },
      {
        label: "Probabilistic forecast",
        text: "The model starts with probabilities and then gives the likely scoreline. This makes confidence easier to compare."
      },
      {
        label: "Best per model",
        text: "The Home view normally shows each model's strongest setup to keep the ranking readable. Filters can reveal every variant."
      }
    ]
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
    text: "Models also answer 15 tournament-long questions: group winners, semifinalists, the top-scorer team, and the world champion."
  },
  {
    label: "Question display",
    text: "The Home table shows one row per model setup and one column per question. Picks appear as flags, with the model's short reasoning behind the info icon."
  },
  {
    label: "Question scoring",
    text: "Question ranking is separate from match ranking. Each correct answer gives 5 points; wrong or unresolved answers give 0."
  },
  {
    label: "Actual answers",
    text: "The table includes an official-results row. Some answers become known during the tournament, while champion and similar picks stay open until the end."
  }
];

export default function AboutPage() {
  return (
    <main className="shell aboutShell">
      <section className="hero compactHero heroCentered">
        <p className="eyebrow">About the project</p>
        <h1>What does LLM SoccerArena do?</h1>
        <p className="heroText">
          LLM SoccerArena compares how large language models predict the FIFA World Cup 2026.
          It keeps the predictions, checks whether they are usable, scores them against real results, and shows the different model variants in the dashboard.
        </p>
      </section>

      <section className="panel aboutIntroPanel">
        <p className="sectionKicker">Core idea</p>
        <h2>One benchmark, many model configurations</h2>
        <p>
          The benchmark compares full prediction setups, not only model names. A row can mean one model with a specific timing,
          information access mode, prompt style, and sample id. That makes the variants visible instead of mixing them together.
        </p>
        <p>
          The Home page starts with a simple best-per-model view. The filters let you open the full setup when you want to compare the variants directly.
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
            A high score means that a model setup has done well on results that are already known.
            It does not prove general soccer understanding, and it does not guarantee the next matches.
          </p>
          <p>
            Rankings can move as more matches are played, new horizons are added, special-question answers become known,
            and pending predictions receive scores.
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
              <strong>Soccer uncertainty</strong>
              <p>Even well-calibrated forecasts can be wrong because soccer outcomes are noisy and low scoring.</p>
            </div>
          </div>
        </div>
      </section>

      <section className="panel aboutPanel aboutTeamPanel">
        <p className="sectionKicker">Developer Team</p>
        <h2>Project contributors</h2>
        <div className="aboutTeamList">
          <div className="aboutTeamMember">
            <strong>Jonas Schweisthal</strong>
            <p>
              PhD researcher at LMU Munich & Munich Center for Machine Learning (MCML). Designed and built the benchmark workflow,
              prediction protocol, scoring pipeline, database architecture, and public dashboard.
            </p>
            <ObfuscatedEmail reversedDomain="ed.uml" reversedLocalPart="lahtsiewhcs.sanoj" />
          </div>
          <div className="aboutTeamMember">
            <strong>Jonas Schr&ouml;der</strong>
            <p>
              PhD researcher at LMU Munich & Munich Center for Machine Learning (MCML). Designed and built the benchmark workflow,
              prediction protocol, scoring pipeline, database architecture, and public dashboard.
            </p>
            <ObfuscatedEmail reversedDomain="ed.uml" reversedLocalPart="redeorhcs.sanoj" />
          </div>
          <div className="aboutTeamMember">
            <strong>Oliver M&uuml;ller</strong>
            <p>
              Scientific collaborator. Professor in Data Analytics at Paderborn University & Head of AI Competence Center
              of the Software Innovation Campus Paderborn (SICP).
            </p>
          </div>
          <div className="aboutTeamMember">
            <strong>Markus Weinmann</strong>
            <p>
              Project lead. Professor in Business Analytics at the University of Cologne & Institute for Business AI.
            </p>
          </div>
          <div className="aboutTeamMember">
            <strong>Stefan Feuerriegel</strong>
            <p>
              Project lead. Professor in AI for Management at LMU Munich School of Management & Munich Center for Machine Learning (MCML).
            </p>
            <ObfuscatedEmail reversedDomain="ed.uml" reversedLocalPart="legeirreuef.nafets" />
          </div>
        </div>
      </section>

      <section className="panel aboutPanel aboutResearchPanel">
        <p className="sectionKicker">Research paper</p>
        <h2>LLM SoccerArena Paper</h2>
        <a className="aboutPdfBox" href="/research-paper.pdf" target="_blank" rel="noreferrer">
          <span>PDF</span>
          <strong>Open the paper</strong>
          <p>The full paper will be available here as a PDF.</p>
        </a>
      </section>
    </main>
  );
}
