import type { Metadata } from "next";
import Link from "next/link";
import { WidgetBuilder } from "@/components/widget-builder";
import { WidgetGrowthFunnel } from "@/components/widget-growth-funnel";
import type { Locale } from "@/lib/i18n";
import { getWidgetPreviewMatches, type WidgetPreviewMatch, type WidgetPreviewMatches } from "@/lib/widget-data";

export const metadata: Metadata = {
  title: "AI Sports Prediction | Editorial widgets",
  description: "Embeddable AI sports prediction widgets for editorial articles.",
  alternates: {
    canonical: "/widgets",
    languages: { "de-DE": "/de/widgets", "en-US": "/widgets", "x-default": "/widgets" }
  }
};

const pricingPlansByLocale: Record<Locale, Array<{
  description: string;
  features: string[];
  name: string;
  plan: "starter" | "growth" | "enterprise";
  annualPrice: string;
  monthlyMinimumTermTotal: string;
  monthlyPrice: string;
}>> = {
  en: [
    {
      name: "Starter",
      monthlyPrice: "49 EUR / month",
      monthlyMinimumTermTotal: "588 EUR",
      annualPrice: "539 EUR / first year",
      description: "For small blogs and local editorial teams publishing prediction embeds.",
      features: ["50k widget requests", "2 domains", "Prediction cards, match lists and win probability", "AI Sports Prediction branding"],
      plan: "starter"
    },
    {
      name: "Growth",
      monthlyPrice: "149 EUR / month",
      monthlyMinimumTermTotal: "1,788 EUR",
      annualPrice: "1,639 EUR / first year",
      description: "For regular sports desks that need more formats and article integrations.",
      features: ["250k widget requests", "8 domains", "All widget types including key factors", "Reasoning toggle and color customization"],
      plan: "growth"
    },
    {
      name: "Enterprise",
      monthlyPrice: "Custom",
      monthlyMinimumTermTotal: "Custom",
      annualPrice: "Custom",
      description: "For high-traffic publishers, agencies and white-label integrations.",
      features: ["Custom traffic volume", "Up to 25 approved domains", "White-label option, SLA and priority support", "Custom widgets and commercial data terms"],
      plan: "enterprise"
    }
  ],
  de: [
    {
      name: "Starter",
      monthlyPrice: "49 EUR / Monat",
      monthlyMinimumTermTotal: "588 EUR",
      annualPrice: "539 EUR / erstes Jahr",
      description: "Für kleine Blogs und lokale Redaktionen, die Prognose-Embeds veröffentlichen.",
      features: ["50k Widget-Aufrufe", "2 Domains", "Prognosekarten, Matchlisten und Sieg-Wahrscheinlichkeit", "AI Sports Prediction Branding"],
      plan: "starter"
    },
    {
      name: "Growth",
      monthlyPrice: "149 EUR / Monat",
      monthlyMinimumTermTotal: "1.788 EUR",
      annualPrice: "1.639 EUR / erstes Jahr",
      description: "Für regelmäßige Sportredaktionen, die mehr Formate und Artikel-Integrationen brauchen.",
      features: ["250k Widget-Aufrufe", "8 Domains", "Alle Widget-Typen inklusive Schlüsselfaktoren", "Begründungs-Schalter und Farbanpassung"],
      plan: "growth"
    },
    {
      name: "Enterprise",
      monthlyPrice: "Individuell",
      monthlyMinimumTermTotal: "Individuell",
      annualPrice: "Individuell",
      description: "Für Publisher mit hohem Traffic, Agenturen und White-Label-Integrationen.",
      features: ["Individuelles Traffic-Volumen", "Bis zu 25 freigegebene Domains", "White-Label-Option, SLA und Prioritäts-Support", "Individuelle Widgets und kommerzielle Datennutzung"],
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
    heroTitle: "More time on page. More interaction. Publish faster.",
    heroText: "Add current, explainable sports predictions to articles in a few minutes with one embed code.",
    heroBenefits: ["Live prediction preview", "API data with quality checks", "No manual match graphics"],
    livePreview: "Live widget preview",
    account: "Customer sign-in",
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
    heroTitle: "Mehr Verweildauer. Mehr Interaktion. Schneller veröffentlichen.",
    heroText: "Aktuelle, nachvollziehbare Sportprognosen in wenigen Minuten per Embed-Code in Artikel einbauen.",
    heroBenefits: ["Interaktive Live-Vorschau", "API-Daten mit Qualitätsprüfung", "Keine manuellen Matchgrafiken"],
    livePreview: "Live-Widget-Vorschau",
    account: "Kunden-Login",
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
  const accountHref = locale === "de" ? "/de/widgets/account/login" : "/widgets/account/login";
  const structuredData = {
    "@context": "https://schema.org",
    "@type": "SoftwareApplication",
    applicationCategory: "BusinessApplication",
    applicationSubCategory: "Sports publishing widget",
    name: "AI Sports Prediction Widgets",
    operatingSystem: "Web",
    offers: [
      { "@type": "Offer", price: "49", priceCurrency: "EUR", name: "Starter monthly" },
      { "@type": "Offer", price: "149", priceCurrency: "EUR", name: "Growth monthly" }
    ],
    url: `https://www.ai-sports-prediction.net${locale === "de" ? "/de" : ""}/widgets`
  };

  return (
    <main className="widgetsPage">
      <section className="widgetsHero">
        <div className="widgetsHeroCopy">
          <p className="footballEyebrow">{text.heroEyebrow}</p>
          <h1>{text.heroTitle}</h1>
          <p>{text.heroText}</p>
          <ul>{text.heroBenefits.map((benefit) => <li key={benefit}>{benefit}</li>)}</ul>
          <div className="widgetsHeroActions">
            <a className="widgetsPricingCta" href="#widget-pricing-title">{locale === "de" ? "Tarife ansehen" : "View plans"}</a>
            <Link href={accountHref}>{text.account}</Link>
          </div>
        </div>
        <div className="widgetsHeroPreview">
          <span>{text.livePreview}</span>
          <WidgetPreview locale={locale} previewMatches={previewMatches} type="prediction" />
        </div>
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

      <WidgetFaq locale={locale} />

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
      <script dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData).replace(/</g, "\\u003c") }} type="application/ld+json" />
    </main>
  );
}

function WidgetFaq({ locale }: { locale: Locale }) {
  const entries = locale === "de" ? [
    ["Wie zuverlässig sind Teams, Wettbewerbe, Logos und Flaggen?", "Nur geprüfte Liga-IDs, passende Teams sowie echte API-Logos und Spielerflaggen werden veröffentlicht. Fehlerhafte Spiele werden automatisch ausgeblendet und intern gemeldet."],
    ["Wie aktuell sind die Widgets?", "Spiele und Prognosen werden regelmäßig synchronisiert. Die eingebettete Ansicht lädt die jeweils freigegebenen aktuellen Daten."],
    ["Wie aufwendig ist die Integration?", "Spiel auswählen, Gestaltung festlegen und den erzeugten Embed-Code einfügen. Das dauert normalerweise nur wenige Minuten."],
    ["Kann ich Branding und Modellwahl steuern?", "Je nach Tarif lassen sich Farben, Begründung und Modellwahl konfigurieren. Growth enthält alle Widget-Formate."],
    ["Wie funktionieren Laufzeit und Kündigung?", "Direkttarife haben zwölf Monate Mindestlaufzeit. Danach verlängern sie sich monatlich. Die Kündigung wird im Kundenkonto zum frühesten zulässigen Termin vorgemerkt."],
    ["Wie werden Datenschutz und Ladezeit behandelt?", "Das Widget verarbeitet nur die technisch notwendigen Zugriffs- und Domaininformationen. Inhalte werden kompakt ausgeliefert und ohne unnötige Drittanbieter-Skripte eingebettet."]
  ] : [
    ["How is data quality protected?", "Only verified league IDs, matching teams, real API logos and player flags are published. Invalid matches are hidden and reported internally."],
    ["How current are the widgets?", "Fixtures and predictions are synchronized regularly. Embeds load the latest approved data."],
    ["How much integration work is required?", "Select a match, configure the design and paste the generated embed code. It usually takes only a few minutes."],
    ["Can I control branding and model selection?", "Depending on the plan, colors, reasoning and model selection can be configured. Growth includes every widget format."],
    ["How do term and cancellation work?", "Direct plans have a twelve-month minimum term and then renew monthly. Cancellation is scheduled in the customer account for the earliest permitted date."],
    ["What about privacy and loading time?", "The widget processes only technical access and domain data needed for delivery. It ships compact content without unnecessary third-party scripts."]
  ];
  return (
    <section className="widgetsPanel widgetsFaq" aria-labelledby="widget-faq-title">
      <div className="widgetsSectionIntro"><p className="footballEyebrow">FAQ</p><h2 id="widget-faq-title">{locale === "de" ? "Häufige Fragen" : "Frequently asked questions"}</h2></div>
      <div>{entries.map(([question, answer]) => <details key={question}><summary>{question}</summary><p>{answer}</p></details>)}</div>
    </section>
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
