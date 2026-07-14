import type { Metadata } from "next";
import { WidgetBuilder } from "@/components/widget-builder";
import type { Locale } from "@/lib/i18n";

export const metadata: Metadata = {
  title: "AI Sports Prediction | Editorial widgets",
  description: "Embeddable AI sports prediction widgets for editorial articles."
};

const pricingPlansByLocale = {
  en: [
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
  ],
  de: [
    {
      name: "Starter",
      price: "49 EUR / Monat",
      description: "Für kleine Blogs und lokale Redaktionen, die Prognose-Embeds testen.",
      features: ["50k Widget-Impressions", "2 Domains", "Prognosekarten, Matchlisten und Sieg-Wahrscheinlichkeit", "AI Sports Prediction Branding"],
      plan: "starter"
    },
    {
      name: "Growth",
      price: "149 EUR / Monat",
      description: "Für regelmäßige Sportredaktionen, die mehr Formate und Artikel-Integrationen brauchen.",
      features: ["250k Widget-Impressions", "8 Domains", "Alle Widget-Typen inklusive Schlüsselfaktoren und Rangliste", "Begründungs-Schalter und Farbanpassung"],
      plan: "growth"
    },
    {
      name: "Enterprise",
      price: "Individuell",
      description: "Für Publisher mit hohem Traffic, Agenturen und White-Label-Integrationen.",
      features: ["Individuelles Traffic-Volumen", "Unbegrenzt freigegebene Domains", "White-Label-Option, SLA und Prioritäts-Support", "Individuelle Widgets und kommerzielle Datennutzung"],
      plan: "enterprise"
    }
  ]
};

const examplesByLocale = {
  en: [
    { title: "Prediction card", description: "One compact match card with pick, score idea and confidence.", type: "prediction" },
    { title: "Match list", description: "Several upcoming predictions for a live blog or matchday article.", type: "list" },
    { title: "Model leaderboard", description: "Confidence overview across the selected sport or competition.", type: "leaderboard" },
    { title: "Win probability", description: "A clean probability view for who the model expects to win.", type: "probability" },
    { title: "Key factors", description: "Editorial bullet points explaining the model signal behind a match.", type: "factors" }
  ],
  de: [
    { title: "Prognosekarte", description: "Eine kompakte Matchkarte mit Tipp, Ergebnisidee und Konfidenz.", type: "prediction" },
    { title: "Matchliste", description: "Mehrere kommende Prognosen für einen Liveblog oder Spieltagsartikel.", type: "list" },
    { title: "Modell-Rangliste", description: "Konfidenz-Übersicht für die gewählte Sportart oder den Wettbewerb.", type: "leaderboard" },
    { title: "Sieg-Wahrscheinlichkeit", description: "Eine klare Wahrscheinlichkeitsansicht für den erwarteten Sieger.", type: "probability" },
    { title: "Schlüsselfaktoren", description: "Redaktionelle Stichpunkte, die das Modellsignal hinter einem Match erklären.", type: "factors" }
  ]
};

const pageText = {
  en: {
    heroEyebrow: "Editorial embeds",
    title: "AI Sports Prediction widgets",
    pricing: "Pricing",
    config: "Config options",
    examplesLabel: "Widget examples",
    examplesTitle: "Widget examples",
    examplesText: "This is how the formats can look inside articles. Colors, sport, match and visible content can be adjusted directly in the builder.",
    options: {
      apiKey: "Required paid publisher key",
      competition: "Optional competition filter",
      matchId: "Optional exact match id",
      limit: "1-12 items",
      accent: "Hex color, e.g. #7df5c1",
      color: "Hex color"
    }
  },
  de: {
    heroEyebrow: "Redaktionelle Embeds",
    title: "AI Sports Prediction Widgets",
    pricing: "Preise",
    config: "Konfiguration",
    examplesLabel: "Widget-Beispiele",
    examplesTitle: "Widget-Beispiele",
    examplesText: "So können die Formate in Artikeln wirken. Farben, Sportart, Spiel und sichtbare Inhalte lassen sich im Builder direkt anpassen.",
    options: {
      apiKey: "Erforderlicher bezahlter Publisher-Schlüssel",
      competition: "Optionaler Wettbewerbsfilter",
      matchId: "Optionale exakte Match-ID",
      limit: "1-12 Einträge",
      accent: "Hex-Farbe, z. B. #7df5c1",
      color: "Hex-Farbe"
    }
  }
};

export default function WidgetsPage() {
  return <WidgetsPageContent locale="en" />;
}

export function WidgetsPageContent({ locale }: { locale: Locale }) {
  const text = pageText[locale];
  const pricingPlans = pricingPlansByLocale[locale];
  const examples = examplesByLocale[locale];

  return (
    <main className="widgetsPage">
      <section className="widgetsHero">
        <p className="footballEyebrow">{text.heroEyebrow}</p>
        <h1>{text.title}</h1>
      </section>

      <section className="widgetsPanel" aria-labelledby="widget-pricing-title">
        <div className="widgetsSectionIntro">
          <h2 id="widget-pricing-title">{text.pricing}</h2>
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
        <h2 id="widget-options-title">{text.config}</h2>
        <div className="widgetsOptionGrid">
          <WidgetOption name="data-api-key" value={text.options.apiKey} />
          <WidgetOption name="data-type" value="prediction-card | match-list | leaderboard | win-probability | key-factors" />
          <WidgetOption name="data-sport" value="all | football | nba | nfl | tennis" />
          <WidgetOption name="data-competition" value={text.options.competition} />
          <WidgetOption name="data-match-id" value={text.options.matchId} />
          <WidgetOption name="data-limit" value={text.options.limit} />
          <WidgetOption name="data-theme" value="dark | light" />
          <WidgetOption name="data-accent" value={text.options.accent} />
          <WidgetOption name="data-background" value={text.options.color} />
          <WidgetOption name="data-text" value={text.options.color} />
          <WidgetOption name="data-show-reasoning" value="1 | 0" />
          <WidgetOption name="data-show-branding" value="1 | 0" />
        </div>
      </section>

      <WidgetBuilder locale={locale} />

      <section className="widgetsExamples" aria-label={text.examplesLabel}>
        <div className="widgetsSectionIntro">
          <h2>{text.examplesTitle}</h2>
          <p>{text.examplesText}</p>
        </div>
        {examples.map((example) => (
          <article className="widgetsExample" key={example.title}>
            <div>
              <h2>{example.title}</h2>
              <p>{example.description}</p>
            </div>
            <WidgetPreview locale={locale} type={example.type} />
          </article>
        ))}
      </section>
    </main>
  );
}

function WidgetPreview({ locale, type }: { locale: Locale; type: string }) {
  const isGerman = locale === "de";

  if (type === "list") {
    return (
      <div className="widgetPreview widgetPreviewLight">
        <div className="widgetPreviewHeader">
          <span>Premier League</span>
          <strong>{isGerman ? "Spieltag-Tipps" : "Matchday picks"}</strong>
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
            pick={isGerman ? "Remis" : "Draw"}
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
          <strong>{isGerman ? "Modell-Rangliste" : "Model leaderboard"}</strong>
        </div>
        <div className="widgetPreviewLeaderboard">
          <WidgetPreviewLeader rank="1" model="AISP Edge" confidence="73%" />
          <WidgetPreviewLeader rank="2" model={isGerman ? "Markt-Mix" : "Market blend"} confidence="68%" />
          <WidgetPreviewLeader rank="3" model={isGerman ? "Formmodell" : "Form model"} confidence="61%" />
        </div>
      </div>
    );
  }

  if (type === "probability") {
    return (
      <div className="widgetPreview">
        <div className="widgetPreviewHeader">
          <span>NBA</span>
          <strong>{isGerman ? "Sieg-Wahrscheinlichkeit" : "Win probability"}</strong>
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
          <strong>{isGerman ? "Schlüsselfaktoren" : "Key factors"}</strong>
        </div>
        <ul className="widgetPreviewFactors">
          <li>{isGerman ? "Das Heimteam erzeugt laut Modell mehr Abschlüsse im letzten Drittel." : "Home side projects higher shot volume in the final third."}</li>
          <li>{isGerman ? "Der Erholungsvorteil stärkt das Drucksignal in der Schlussphase." : "Rest advantage improves late-game pressure signal."}</li>
          <li>{isGerman ? "Die höchste Konfidenz liegt im Ergebnisband rund um 2:1." : "Model confidence is strongest on the 2:1 score band."}</li>
        </ul>
      </div>
    );
  }

  return (
    <div className="widgetPreview">
      <div className="widgetPreviewHeader">
        <span>NBA · 11.07.2026</span>
        <strong>{isGerman ? "KI-Prognose" : "AI prediction"}</strong>
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
          <span>{isGerman ? "Tipp" : "Pick"}</span>
          <strong>Boston Celtics</strong>
        </div>
        <div>
          <span>{isGerman ? "Prognose-Score" : "Projected score"}</span>
          <strong>2:1</strong>
        </div>
        <div>
          <span>{isGerman ? "Konfidenz" : "Confidence"}</span>
          <strong>67%</strong>
        </div>
      </div>
      <div className="widgetPreviewReasoning">
        <span>{isGerman ? "Modell-Begründung" : "Model reasoning"}</span>
        <p>
          {isGerman
            ? "Boston liegt bei Erholung, defensiver Effizienz und Wurfqualität in der Schlussphase vorn. Das Modell sieht deshalb einen knappen 2:1-Vorteil."
            : "Boston rates higher on rest, defensive efficiency and late-game shot quality, with the model leaning toward a narrow 2:1 edge."}
        </p>
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
