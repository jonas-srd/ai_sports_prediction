import type { Metadata } from "next";
import { WidgetBuilder } from "@/components/widget-builder";

export const metadata: Metadata = {
  title: "AI Sports Prediction | Editorial widgets",
  description: "Embeddable AI sports prediction widgets for editorial articles."
};

const pricingPlans = [
  {
    name: "Starter",
    price: "49 EUR / month",
    description: "For small blogs and local editorial teams testing prediction embeds.",
    features: ["50k widget impressions", "2 domains", "Prediction cards, match lists and win probability", "AI Sports Prediction branding"],
    plan: "starter"
  },
  {
    name: "Growth",
    price: "149 EUR / month",
    description: "For regular sports desks that need more formats and article integrations.",
    features: ["250k widget impressions", "8 domains", "All widget types including key factors and leaderboard", "Reasoning toggle and color customization"],
    plan: "growth"
  },
  {
    name: "Enterprise",
    price: "Custom",
    description: "For high-traffic publishers, agencies and white-label integrations.",
    features: ["Custom traffic volume", "Unlimited approved domains", "White-label option, SLA and priority support", "Custom widgets and commercial data terms"],
    plan: "enterprise"
  }
];

const examples = [
  {
    title: "Prediction card",
    description: "One compact match card with pick, score idea and confidence.",
    type: "prediction"
  },
  {
    title: "Match list",
    description: "Several upcoming predictions for a live blog or matchday article.",
    type: "list"
  },
  {
    title: "Model leaderboard",
    description: "Confidence overview across the selected sport or competition.",
    type: "leaderboard"
  },
  {
    title: "Win probability",
    description: "A clean probability view for who the model expects to win.",
    type: "probability"
  },
  {
    title: "Key factors",
    description: "Editorial bullet points explaining the model signal behind a match.",
    type: "factors"
  }
];

export default function WidgetsPage() {
  return (
    <main className="widgetsPage">
      <section className="widgetsHero">
        <p className="footballEyebrow">Editorial embeds</p>
        <h1>AI Sports Prediction widgets</h1>
      </section>

      <section className="widgetsPanel" aria-labelledby="widget-pricing-title">
        <div className="widgetsSectionIntro">
          <h2 id="widget-pricing-title">Pricing</h2>
        </div>
        <div className="widgetsPricingGrid">
          {pricingPlans.map((plan) => (
            <article className="widgetsPricingCard" key={plan.name}>
              <div>
                <span>{plan.plan}</span>
                <h3>{plan.name}</h3>
                <strong>{plan.price}</strong>
                <p>{plan.description}</p>
              </div>
              <ul>
                {plan.features.map((feature) => (
                  <li key={feature}>{feature}</li>
                ))}
              </ul>
            </article>
          ))}
        </div>
      </section>

      <section className="widgetsPanel" aria-labelledby="widget-options-title">
        <h2 id="widget-options-title">Config options</h2>
        <div className="widgetsOptionGrid">
          <WidgetOption name="data-api-key" value="Required paid publisher key" />
          <WidgetOption name="data-type" value="prediction-card | match-list | leaderboard | win-probability | key-factors" />
          <WidgetOption name="data-sport" value="all | football | nba | nfl | tennis" />
          <WidgetOption name="data-competition" value="Optional competition filter" />
          <WidgetOption name="data-match-id" value="Optional exact match id" />
          <WidgetOption name="data-limit" value="1-12 items" />
          <WidgetOption name="data-theme" value="dark | light" />
          <WidgetOption name="data-accent" value="Hex color, e.g. #7df5c1" />
          <WidgetOption name="data-background" value="Hex color" />
          <WidgetOption name="data-text" value="Hex color" />
          <WidgetOption name="data-show-reasoning" value="1 | 0" />
          <WidgetOption name="data-show-branding" value="1 | 0" />
        </div>
      </section>

      <WidgetBuilder />

      <section className="widgetsExamples" aria-label="Widget examples">
        <div className="widgetsSectionIntro">
          <h2>Widget examples</h2>
          <p>
            So koennen die Formate in Artikeln wirken. Farben, Sportart, Spiel und sichtbare
            Inhalte lassen sich im Builder darueber anpassen.
          </p>
        </div>
        {examples.map((example) => (
          <article className="widgetsExample" key={example.title}>
            <div>
              <h2>{example.title}</h2>
              <p>{example.description}</p>
            </div>
            <WidgetPreview type={example.type} />
          </article>
        ))}
      </section>
    </main>
  );
}

function WidgetPreview({ type }: { type: string }) {
  if (type === "list") {
    return (
      <div className="widgetPreview widgetPreviewLight">
        <div className="widgetPreviewHeader">
          <span>Premier League</span>
          <strong>Matchday picks</strong>
        </div>
        <div className="widgetPreviewList">
          <WidgetPreviewRow
            away="Chelsea"
            awayLogo="https://a.espncdn.com/i/teamlogos/soccer/500/363.png"
            confidence="64%"
            home="Arsenal"
            homeLogo="https://a.espncdn.com/i/teamlogos/soccer/500/359.png"
            pick="Arsenal"
            score="2:1"
          />
          <WidgetPreviewRow
            away="Tottenham"
            awayLogo="https://a.espncdn.com/i/teamlogos/soccer/500/367.png"
            confidence="71%"
            home="Liverpool"
            homeLogo="https://a.espncdn.com/i/teamlogos/soccer/500/364.png"
            pick="Liverpool"
            score="3:1"
          />
          <WidgetPreviewRow
            away="Newcastle"
            awayLogo="https://a.espncdn.com/i/teamlogos/soccer/500/361.png"
            confidence="52%"
            home="Aston Villa"
            homeLogo="https://a.espncdn.com/i/teamlogos/soccer/500/362.png"
            pick="Draw"
            score="1:1"
          />
        </div>
      </div>
    );
  }

  if (type === "leaderboard") {
    return (
      <div className="widgetPreview">
        <div className="widgetPreviewHeader">
          <span>Tennis</span>
          <strong>Model leaderboard</strong>
        </div>
        <div className="widgetPreviewLeaderboard">
          <WidgetPreviewLeader rank="1" model="AISP Edge" confidence="73%" />
          <WidgetPreviewLeader rank="2" model="Market blend" confidence="68%" />
          <WidgetPreviewLeader rank="3" model="Form model" confidence="61%" />
        </div>
      </div>
    );
  }

  if (type === "probability") {
    return (
      <div className="widgetPreview">
        <div className="widgetPreviewHeader">
          <span>NBA</span>
          <strong>Win probability</strong>
        </div>
        <div className="widgetPreviewProbability">
          <span className="widgetPreviewProbabilityTeam">
            <img alt="" src="https://a.espncdn.com/i/teamlogos/nba/500/bos.png" />
            Boston Celtics
          </span>
          <strong>67%</strong>
          <div><span style={{ width: "67%" }} /></div>
          <span className="widgetPreviewProbabilityTeam">
            <img alt="" src="https://a.espncdn.com/i/teamlogos/nba/500/ny.png" />
            New York Knicks
          </span>
          <strong>33%</strong>
          <div><span style={{ width: "33%" }} /></div>
        </div>
      </div>
    );
  }

  if (type === "factors") {
    return (
      <div className="widgetPreview widgetPreviewLight">
        <div className="widgetPreviewHeader">
          <span>Champions League</span>
          <strong>Key factors</strong>
        </div>
        <ul className="widgetPreviewFactors">
          <li>Home side projects higher shot volume in the final third.</li>
          <li>Rest advantage improves late-game pressure signal.</li>
          <li>Model confidence is strongest on the 2:1 score band.</li>
        </ul>
      </div>
    );
  }

  return (
    <div className="widgetPreview">
      <div className="widgetPreviewHeader">
        <span>NBA · 11.07.2026</span>
        <strong>AI prediction</strong>
      </div>
      <div className="widgetPreviewTeams">
        <div>
          <img alt="" src="https://a.espncdn.com/i/teamlogos/nba/500/bos.png" />
          <strong>Boston Celtics</strong>
        </div>
        <span>vs</span>
        <div>
          <strong>New York Knicks</strong>
          <img alt="" src="https://a.espncdn.com/i/teamlogos/nba/500/ny.png" />
        </div>
      </div>
      <div className="widgetPreviewMetrics">
        <div>
          <span>Pick</span>
          <strong>Boston Celtics</strong>
        </div>
        <div>
          <span>Projected score</span>
          <strong>2:1</strong>
        </div>
        <div>
          <span>Confidence</span>
          <strong>67%</strong>
        </div>
      </div>
      <div className="widgetPreviewReasoning">
        <span>Model reasoning</span>
        <p>Boston rates higher on rest, defensive efficiency and late-game shot quality, with the model leaning toward a narrow 2:1 edge.</p>
      </div>
    </div>
  );
}

function WidgetPreviewRow({
  away,
  awayLogo,
  confidence,
  home,
  homeLogo,
  pick,
  score
}: {
  away: string;
  awayLogo: string;
  confidence: string;
  home: string;
  homeLogo: string;
  pick: string;
  score: string;
}) {
  return (
    <div>
      <span className="widgetPreviewListTeams">
        <img alt="" src={homeLogo} />
        <strong>{home}</strong>
        <em>vs</em>
        <img alt="" src={awayLogo} />
        <strong>{away}</strong>
      </span>
      <strong>{pick}</strong>
      <em>{score}</em>
      <small>{confidence}</small>
    </div>
  );
}

function WidgetPreviewLeader({ confidence, model, rank }: { confidence: string; model: string; rank: string }) {
  return (
    <div>
      <span>{rank}</span>
      <strong>{model}</strong>
      <em>{confidence}</em>
    </div>
  );
}

function WidgetOption({ name, value }: { name: string; value: string }) {
  return (
    <div className="widgetsOption">
      <strong>{name}</strong>
      <span>{value}</span>
    </div>
  );
}
