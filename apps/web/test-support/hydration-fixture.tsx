import { Suspense, type ReactNode } from "react";
import { LocaleProvider } from "../src/components/locale-provider";
import { TimeZoneProvider } from "../src/components/time-zone-provider";
import { LocalMatchDate } from "../src/components/local-match-date";
import { PredictionModelProvider, SelectedHomePrediction } from "../src/components/prediction-model-selector";
import { PublicSiteTranslator } from "../src/components/public-site-translator";
import type { ModelPredictionSet } from "../src/lib/prediction-models";

let ready = false;
let pending: Promise<void> | undefined;
function DelayedHydration({ children }: { children: ReactNode }) {
  if (typeof window !== "undefined" && !ready) {
    pending ??= new Promise<void>((resolve) => setTimeout(() => { ready = true; resolve(); }, 500));
    throw pending;
  }
  return children;
}

function variants(home: string, away: string): ModelPredictionSet {
  return Object.fromEntries(["nexus", "pulse", "edge"].map((model, index) => [model, {
    confidence: 68 - index,
    model,
    pick: home,
    probabilities: [{ label: "home", name: home, value: 68 - index }, { label: "away", name: away, value: 32 + index }],
    reason: "Buffalo has strong historical performance at Highmark Stadium, with consistent offensive outputs.",
    score: `${24 + index}:20`,
    source: "bedrock",
    modelVersion: "eu.amazon.nova-2-lite-v1:0"
  }])) as ModelPredictionSet;
}

export function HydrationFixture({ locale = "en" }: { locale?: "en" | "de" }) {
  const labels = locale === "de"
    ? { prediction: "KI-Prognose", reason: "Begründung", score: "Prognose-Ergebnis" }
    : { prediction: "AI prediction", reason: "Reasoning", score: "Predicted score" };
  return <LocaleProvider initialSiteLocale="en"><TimeZoneProvider><PredictionModelProvider>
    <div className="publicSite">
      <h1>Hydration regression fixture</h1>
      {["Levski Sofia", "Buffalo Bills"].map((home) => <Suspense key={home} fallback={<p>Loading</p>}>
        <DelayedHydration><article>
          <LocalMatchDate value="2026-09-20T18:00:00.000Z" />
          <SelectedHomePrediction locale={locale} labels={labels} variants={variants(home, "Away Team")} />
        </article></DelayedHydration>
      </Suspense>)}
      <PublicSiteTranslator />
    </div>
  </PredictionModelProvider></TimeZoneProvider></LocaleProvider>;
}
