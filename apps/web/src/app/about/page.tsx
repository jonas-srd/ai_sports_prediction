import type { Metadata } from "next";

import { ObfuscatedEmail } from "@/components/obfuscated-email";

export const metadata: Metadata = {
  title: "About | LLM SoccerArena",
  description: "Project overview, methodology, scoring, and limitations of LLM SoccerArena."
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
    label: "What this is",
    text: "LLM SoccerArena is a live football prediction benchmark for artificial intelligence. During the 2026 FIFA World Cup, leading AI language models predict matches and tournament outcomes, and we compare those forecasts with the official results."
  },
  {
    label: "The question",
    text: "AI chatbots often sound confident. Football is a hard public test: the fixtures are known, the outcomes are unambiguous, and nobody knows the result in advance. We ask whether language models can forecast football, and whether live web access helps."
  },
  {
    label: "What the site shows",
    text: "The dashboard shows model leaderboards, every model pick for each match, tournament-long question predictions, a tournament tree, the match schedule, and detailed analytics for different model setups."
  },
  {
    label: "What the ranking means",
    text: "A high ranking means that a model setup has done well on matches scored so far. It does not prove football understanding, and it does not predict the next match with certainty."
  }
];

const pipelineSteps = [
  {
    title: "1. Before a match",
    text: "Each model setup predicts the most likely 90-minute score, outcome probabilities, expected goals, full-match probabilities, and knockout advancement probabilities where relevant."
  },
  {
    title: "2. Timestamp and store",
    text: "Predictions are stored with prompt, raw response, run id, match id, timing metadata, model id, access condition, prompt strategy, forecast horizon, and sample id."
  },
  {
    title: "3. Validate",
    text: "Responses must be valid JSON with required fields, probabilities in range, probability vectors summing to 1 within tolerance, and non-negative integer scorelines."
  },
  {
    title: "4. Evaluate",
    text: "After official results are available, the system computes match points plus probabilistic, categorical, scoreline, and reliability metrics."
  }
];

const researchQuestions = [
  "How accurately do different models forecast World Cup 2026 matches?",
  "Does open-book web access improve forecasts compared with closed-book prediction?",
  "Does probabilistic prompting improve forecasts compared with direct-score prompting?",
  "How often do models produce valid, usable, internally consistent predictions?",
  "How well do models predict knockout advancement?"
];

const designGroups: AboutDesignGroup[] = [
  {
    title: "Experimental design",
    entries: [
      {
        label: "2x2 benchmark",
        text: "The core design crosses two information-access conditions, closed book and open book, with two prompt strategies, direct score and probabilistic forecast."
      },
      {
        label: "Experimental unit",
        text: "The unit is model x match x forecast horizon x access condition x prompt strategy x sample id. The core benchmark uses one deterministic call per unit."
      },
      {
        label: "Model setups",
        text: "The public interface distinguishes complete setups, not only model names. This keeps open-book, closed-book, direct-score, probabilistic, and horizon variants separate."
      }
    ]
  },
  {
    title: "Forecast timing",
    entries: [
      {
        label: "T-24h",
        text: "Predictions made roughly 24 hours before kickoff. Primary analyses can be restricted to valid T-24h predictions."
      },
      {
        label: "T-2h",
        text: "Predictions made roughly two hours before kickoff. This horizon is operationally more fragile, but can include later public information in open-book runs."
      },
      {
        label: "STAGE_OPENING",
        text: "Group-stage fixtures are predicted once at stage opening; knockout fixtures are predicted once the pairing is known. These forecasts are not used to fill missing T-24h forecasts."
      }
    ]
  },
  {
    title: "Information access and prompts",
    branches: [
      {
        label: "Information access",
        text: "Exactly one access condition is used for a prediction run.",
        choices: [
          {
            label: "Closed book",
            text: "Fixture-identifying fields only; no web search, tools, odds, news, form, rankings, injuries, or lineups."
          },
          {
            label: "Open book",
            text: "Same fixture block plus configured web-search/tool access and an instruction to retrieve current public information."
          }
        ]
      },
      {
        label: "Prompt strategy",
        text: "Exactly one prompt strategy is paired with the access condition.",
        choices: [
          {
            label: "Direct score",
            text: "Predict the most likely scoreline first, then provide probabilities consistent with it."
          },
          {
            label: "Probabilistic forecast",
            text: "Estimate calibrated probabilities and expected goals first, then derive the scoreline."
          }
        ]
      }
    ]
  }
];

const metrics = [
  {
    label: "Game-style points",
    text: "Exact 90-minute score receives 5 points, correct goal difference receives 2, correct tendency receives 1, and misses receive 0."
  },
  {
    label: "Probability metrics",
    text: "The benchmark reports 90-minute multiclass Brier score and multiclass log loss. Lower values are better."
  },
  {
    label: "Accuracy metrics",
    text: "We track top-outcome accuracy, tendency accuracy from the predicted score, exact-score accuracy, goal-difference accuracy, and knockout advancement accuracy."
  },
  {
    label: "Reliability diagnostics",
    text: "We report invalid-output, repair, normalization, missing, open-book search-observed, and score-probability consistency rates."
  },
  {
    label: "Tournament questions",
    text: "Each model setup answers 15 tournament-long questions. These are ranked separately from match predictions, with 5 points for each correct call."
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
  "One tournament is a small sample, especially early on.",
  "Newer models may know more recent public information even in closed-book mode.",
  "Open-book models can read public odds or market summaries, so open-book results must be interpreted carefully.",
  "Knockout matches after extra time and penalties require separate advancement metrics.",
  "Football is noisy and low scoring, so even well-calibrated forecasts often miss."
];

export default function AboutPage() {
  return (
    <main className="shell aboutShell">
      <section className="hero compactHero heroCentered">
        <p className="eyebrow">About the project</p>
        <h1>LLM SoccerArena</h1>
        <p className="heroText">
          A live, timestamped benchmark for how large language models forecast the FIFA World Cup 2026.
        </p>
      </section>

      <nav className="aboutAnchorNav" aria-label="About page sections">
        <a href="#about">About LLM SoccerArena</a>
        <a href="#methodology">Methodology</a>
        <a href="#team">Team</a>
      </nav>

      <header className="aboutSectionHeader" id="about">
        <p className="sectionKicker">Section 1</p>
        <h2>About LLM SoccerArena</h2>
        <p>What the project is, what the dashboard shows, and how to read the ranking.</p>
      </header>

      <section className="panel aboutIntroPanel">
        <p className="sectionKicker">Overview</p>
        <h2>What this benchmark does</h2>
        <p>
          It works like a prediction game in which the players are GPT-5.5, Claude, Gemini, Grok,
          DeepSeek, Qwen, Mistral, and other model setups instead of people. The forecasts are
          research outputs and public benchmark data, not betting advice.
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
        <p className="sectionKicker">Section 2</p>
        <h2>Methodology</h2>
        <p>How predictions are generated, validated, scored, and separated by setup.</p>
      </header>

      <section className="panel aboutPanel aboutMethodologyPanel">
        <p className="sectionKicker">Pipeline</p>
        <h2>How the benchmark works</h2>
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
          <p className="sectionKicker">Research questions</p>
          <h2>What we test</h2>
          <ul className="aboutBulletList">
            {researchQuestions.map((question) => (
              <li key={question}>{question}</li>
            ))}
          </ul>
        </div>

        <div className="panel aboutPanel">
          <p className="sectionKicker">Models</p>
          <h2>Active flagship set</h2>
          <p>
            The active 2x2 comparison is run through OpenRouter. The exact roster can change
            with model availability, but the current active set is:
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
            <p className="sectionKicker">Methodology</p>
            <h2>{group.title}</h2>
            {"branches" in group ? (
              <div className="aboutNestedSetup">
                <div className="aboutNestedRoot">One model setup</div>
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
          <p className="sectionKicker">Evaluation</p>
          <h2>Scoring and metrics</h2>
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
          <p className="sectionKicker">Limitations</p>
          <h2>How to interpret the ranking</h2>
          <ul className="aboutBulletList">
            {limitations.map((limitation) => (
              <li key={limitation}>{limitation}</li>
            ))}
          </ul>
          <p>
            Rankings shift as more matches are played, more horizons are added, and pending
            tournament-long answers resolve.
          </p>
        </div>
      </section>

      <header className="aboutSectionHeader" id="team">
        <p className="sectionKicker">Section 3</p>
        <h2>Team</h2>
        <p>The researchers and contributors behind LLM SoccerArena.</p>
      </header>

      <section className="panel aboutPanel aboutTeamPanel">
        <p className="sectionKicker">People</p>
        <h2>Who is behind it</h2>
        <div className="aboutTeamList">
          <div className="aboutTeamMember">
            <strong>Jonas Schweisthal</strong>
            <p>PhD researcher at LMU Munich and the Munich Center for Machine Learning (MCML).</p>
            <ObfuscatedEmail reversedDomain="ed.uml" reversedLocalPart="lahtsiewhcs.sanoj" />
          </div>
          <div className="aboutTeamMember">
            <strong>Jonas Schr&ouml;der</strong>
            <p>PhD researcher at LMU Munich and the Munich Center for Machine Learning (MCML).</p>
            <ObfuscatedEmail reversedDomain="ed.uml" reversedLocalPart="redeorhcs.sanoj" />
          </div>
          <div className="aboutTeamMember">
            <strong>Oliver M&uuml;ller</strong>
            <p>Professor of Data Analytics at Paderborn University and Head of the AI Competence Center at SICP.</p>
          </div>
          <div className="aboutTeamMember">
            <strong>Markus Weinmann</strong>
            <p>Professor of Business Analytics at the University of Cologne and the Institute for Business AI.</p>
          </div>
          <div className="aboutTeamMember">
            <strong>Stefan Feuerriegel</strong>
            <p>Professor of AI for Management at LMU Munich School of Management and MCML.</p>
            <ObfuscatedEmail reversedDomain="ed.uml" reversedLocalPart="legeirreuef" />
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
