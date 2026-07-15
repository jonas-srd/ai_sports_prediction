import type { Metadata } from "next";
import { WidgetBuilder } from "@/components/widget-builder";
import { WidgetGrowthFunnel } from "@/components/widget-growth-funnel";
import type { Locale } from "@/lib/i18n";
import { getWidgetPreviewMatches, type WidgetPreviewMatch, type WidgetPreviewMatches } from "@/lib/widget-data";

export const metadata: Metadata = {
  title: "AI Sports Prediction | Editorial widgets",
  description: "Embeddable AI sports prediction widgets for editorial articles."
};

const pricingPlansByLocale: Record<Locale, Array<{
  description: string;
  features: string[];
  name: string;
  plan: "starter" | "growth" | "enterprise";
  price: string;
}>> = {
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
      features: ["250k widget impressions", "8 domains", "All widget types including key factors", "Reasoning toggle and color customization"],
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
      features: ["250k Widget-Impressions", "8 Domains", "Alle Widget-Typen inklusive Schlüsselfaktoren", "Begründungs-Schalter und Farbanpassung"],
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
    { title: "Win probability", description: "A clean probability view for who the model expects to win.", type: "probability" },
    { title: "Key factors", description: "Editorial bullet points explaining the model signal behind a match.", type: "factors" }
  ],
  de: [
    { title: "Prognosekarte", description: "Eine kompakte Matchkarte mit Tipp, Ergebnisidee und Konfidenz.", type: "prediction" },
    { title: "Matchliste", description: "Mehrere kommende Prognosen für einen Liveblog oder Spieltagsartikel.", type: "list" },
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
      language: "English or German widget interface",
      model: "Fixed model or visitor model switcher",
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
      language: "Deutsche oder englische Widget-Oberfläche",
      model: "Festes Modell oder Modellauswahl für Besucher",
      accent: "Hex-Farbe, z. B. #7df5c1",
      color: "Hex-Farbe"
    }
  }
};

export default function WidgetsPage() {
  return <WidgetsPageContent locale="en" />;
}

export async function WidgetsPageContent({ locale }: { locale: Locale }) {
  const text = pageText[locale];
  const pricingPlans = pricingPlansByLocale[locale];
  const examples = examplesByLocale[locale];
  const previewMatches = await getWidgetPreviewMatches();

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
        <WidgetGrowthFunnel locale={locale} plans={pricingPlans} />
      </section>

      <section className="widgetsPanel" aria-labelledby="widget-options-title">
        <h2 id="widget-options-title">{text.config}</h2>
        <div className="widgetsOptionGrid">
          <WidgetOption name="data-api-key" value={text.options.apiKey} />
          <WidgetOption name="data-type" value="prediction-card | match-list | win-probability | key-factors" />
          <WidgetOption name="data-sport" value="all | football | nba | nfl | tennis" />
          <WidgetOption name="data-language" value={`en | de · ${text.options.language}`} />
          <WidgetOption name="data-model" value={`viewer | nexus | pulse | edge · ${text.options.model}`} />
          <WidgetOption name="data-competition" value={text.options.competition} />
          <WidgetOption name="data-match-id" value={text.options.matchId} />
          <WidgetOption name="data-match-ids" value={locale === "de" ? "Mehrere ausgewählte Match-IDs, kommagetrennt" : "Multiple selected match ids, comma-separated"} />
          <WidgetOption name="data-limit" value={text.options.limit} />
          <WidgetOption name="data-theme" value="dark | light" />
          <WidgetOption name="data-accent" value={text.options.accent} />
          <WidgetOption name="data-background" value={text.options.color} />
          <WidgetOption name="data-text" value={text.options.color} />
          <WidgetOption name="data-show-reasoning" value="1 | 0" />
          <WidgetOption name="data-show-branding" value="1 | 0" />
        </div>
      </section>

      <WidgetBuilder locale={locale} previewMatches={previewMatches} />

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
            <WidgetPreview locale={locale} previewMatches={previewMatches} type={example.type} />
          </article>
        ))}
      </section>
    </main>
  );
}

function WidgetPreview({ locale, previewMatches, type }: { locale: Locale; previewMatches: WidgetPreviewMatches; type: string }) {
  const isGerman = locale === "de";
  const availableMatches = Object.values(previewMatches).flat().filter((match): match is WidgetPreviewMatch => Boolean(match));
  const primaryMatch = previewMatches.nba?.[0] ?? availableMatches[0] ?? null;

  if (type === "list") {
    if (!availableMatches.length) return <WidgetPreviewUnavailable locale={locale} />;
    return (
      <div className="widgetPreview widgetPreviewLight">
        <div className="widgetPreviewHeader">
          <span>Premier League</span>
          <strong>{isGerman ? "Spieltag-Tipps" : "Matchday picks"}</strong>
        </div>
        <div className="widgetPreviewList">
          {(previewMatches.football ?? availableMatches).slice(0, 3).map((match, index) => (
            <WidgetPreviewRow
              away={match.awayTeam}
              awayLogo={match.awayLogo}
              confidence={`${64 + index * 3}%`}
              home={match.homeTeam}
              homeLogo={match.homeLogo}
              key={`${match.sport}:${match.homeTeam}:${match.awayTeam}`}
              pick={match.homeTeam}
              score={index === 1 ? "1:1" : "2:1"}
            />
          ))}
        </div>
      </div>
    );
  }

  if (type === "probability") {
    if (!primaryMatch) return <WidgetPreviewUnavailable locale={locale} />;
    return (
      <div className="widgetPreview">
        <div className="widgetPreviewHeader">
          <span>NBA</span>
          <strong>{isGerman ? "Sieg-Wahrscheinlichkeit" : "Win probability"}</strong>
        </div>
        <div className="widgetPreviewProbability">
          <span className="widgetPreviewProbabilityTeam">
            <img alt={`${primaryMatch.homeTeam} logo`} src={primaryMatch.homeLogo} />
            {primaryMatch.homeTeam}
          </span>
          <strong>67%</strong>
          <div><span style={{ width: "67%" }} /></div>
          <span className="widgetPreviewProbabilityTeam">
            <img alt={`${primaryMatch.awayTeam} logo`} src={primaryMatch.awayLogo} />
            {primaryMatch.awayTeam}
          </span>
          <strong>33%</strong>
          <div><span style={{ width: "33%" }} /></div>
        </div>
      </div>
    );
  }

  if (type === "factors") {
    const factorMatch = previewMatches.football?.[0] ?? primaryMatch;
    if (!factorMatch) return <WidgetPreviewUnavailable locale={locale} />;
    return (
      <div className="widgetPreview widgetPreviewLight">
        <div className="widgetPreviewHeader">
          <span>{factorMatch.competition}</span>
          <strong>{isGerman ? "Schlüsselfaktoren" : "Key factors"}</strong>
        </div>
        <WidgetPreviewTeams match={factorMatch} />
        <ul className="widgetPreviewFactors">
          <li>{isGerman ? "Das Heimteam erzeugt laut Modell mehr Abschlüsse im letzten Drittel." : "Home side projects higher shot volume in the final third."}</li>
          <li>{isGerman ? "Der Erholungsvorteil stärkt das Drucksignal in der Schlussphase." : "Rest advantage improves late-game pressure signal."}</li>
          <li>{isGerman ? "Die höchste Konfidenz liegt im Ergebnisband rund um 2:1." : "Model confidence is strongest on the 2:1 score band."}</li>
        </ul>
      </div>
    );
  }

  if (!primaryMatch) return <WidgetPreviewUnavailable locale={locale} />;

  return (
    <div className="widgetPreview">
      <div className="widgetPreviewHeader">
        <span>{primaryMatch.competition}</span>
        <strong>{isGerman ? "KI-Prognose" : "AI prediction"}</strong>
      </div>
      <WidgetPreviewTeams match={primaryMatch} />
      <div className="widgetPreviewMetrics">
        <div>
          <span>{isGerman ? "Tipp" : "Pick"}</span>
          <strong>{primaryMatch.homeTeam}</strong>
        </div>
        <div>
          <span>{isGerman ? "Prognose-Score" : "Projected score"}</span>
          <strong>112:106</strong>
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
            ? `${primaryMatch.homeTeam} liegt bei Pace, Rotationstiefe, Wurfprofil und Erholung vorn.`
            : `${primaryMatch.homeTeam} rates higher on pace, rotation depth, shot profile and rest.`}
        </p>
      </div>
    </div>
  );
}

function WidgetPreviewTeams({ match }: { match: WidgetPreviewMatch }) {
  return (
    <div className="widgetPreviewTeams">
      <div><img alt={`${match.homeTeam} logo`} src={match.homeLogo} /><strong>{match.homeTeam}</strong></div>
      <span>vs</span>
      <div><strong>{match.awayTeam}</strong><img alt={`${match.awayTeam} logo`} src={match.awayLogo} /></div>
    </div>
  );
}

function WidgetPreviewUnavailable({ locale }: { locale: Locale }) {
  return <div className="widgetPreview"><p>{locale === "de" ? "Vorschau wird geladen, sobald zwei API-Logos verfügbar sind." : "Preview loads when two API logos are available."}</p></div>;
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
        <img alt={`${home} logo`} src={homeLogo} />
        <strong>{home}</strong>
        <em>vs</em>
        <img alt={`${away} logo`} src={awayLogo} />
        <strong>{away}</strong>
      </span>
      <strong>{pick}</strong>
      <em>{score}</em>
      <small>{confidence}</small>
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
