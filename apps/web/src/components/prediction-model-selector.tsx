"use client";

import { createContext, useContext, useEffect, useMemo, useState, type CSSProperties, type ReactNode } from "react";
import { useLocale } from "@/components/locale-provider";
import type { Locale } from "@/lib/i18n";
import {
  getPredictionModel,
  PREDICTION_MODELS,
  type ModelPredictionSet,
  type PredictionModelId
} from "@/lib/prediction-models";

const STORAGE_KEY = "ai-sports-prediction:model";

const PredictionModelContext = createContext<{
  model: PredictionModelId;
  setModel: (model: PredictionModelId) => void;
} | null>(null);

export function PredictionModelProvider({ children }: { children: ReactNode }) {
  const [model, setModelState] = useState<PredictionModelId>("nexus");

  useEffect(() => {
    const stored = window.localStorage.getItem(STORAGE_KEY);
    if (isPredictionModelId(stored)) setModelState(stored);
  }, []);

  const value = useMemo(() => ({
    model,
    setModel: (nextModel: PredictionModelId) => {
      setModelState(nextModel);
      window.localStorage.setItem(STORAGE_KEY, nextModel);
    }
  }), [model]);

  return <PredictionModelContext.Provider value={value}>{children}</PredictionModelContext.Provider>;
}

export function usePredictionModel() {
  const context = useContext(PredictionModelContext);
  if (!context) throw new Error("usePredictionModel must be used inside PredictionModelProvider.");
  return context;
}

export function GlobalPredictionModelBar() {
  const { locale } = useLocale();
  const { model } = usePredictionModel();
  const activeModel = getPredictionModel(model);

  return (
    <section className="globalModelBar" style={{ "--model-accent": activeModel.accent } as CSSProperties}>
      <div className="globalModelBarInner">
        <div className="globalModelCopy">
          <span>{locale === "de" ? "KI-Modell" : "AI model"}</span>
          <p>{activeModel.description[locale]}</p>
        </div>
        <PredictionModelSelector locale={locale} />
      </div>
    </section>
  );
}

export function PredictionModelSelector({
  compact = false,
  locale,
  showLabel = false
}: {
  compact?: boolean;
  locale: Locale;
  showLabel?: boolean;
}) {
  const { model, setModel } = usePredictionModel();

  return (
    <div className={`predictionModelControl${compact ? " isCompact" : ""}`}>
      {showLabel ? <span>{locale === "de" ? "Modell wählen" : "Choose model"}</span> : null}
      <div aria-label={locale === "de" ? "KI-Modell auswählen" : "Choose AI model"} className="predictionModelSelector" role="radiogroup">
        {PREDICTION_MODELS.map((item) => (
          <button
            aria-checked={model === item.id}
            className={model === item.id ? "isActive" : ""}
            key={item.id}
            onClick={() => setModel(item.id)}
            role="radio"
            style={{ "--model-accent": item.accent } as CSSProperties}
            title={item.description[locale]}
            type="button"
          >
            <span />
            {item.name}
          </button>
        ))}
      </div>
    </div>
  );
}

export function SelectedModelPrediction({
  children,
  className = "fixturePredictionMain",
  labels,
  locale,
  showSelector = false,
  variants
}: {
  children?: ReactNode;
  className?: string;
  labels: {
    pick: string;
    prediction: string;
    probability: string;
    reason: string;
    score: string;
  };
  locale: Locale;
  showSelector?: boolean;
  variants: ModelPredictionSet;
}) {
  const { model } = usePredictionModel();
  const prediction = variants[model];
  const metadata = getPredictionModel(model);

  return (
    <div className={`${className} selectedModelPrediction`} style={{ "--model-accent": metadata.accent } as CSSProperties}>
      <div className="selectedModelPredictionHeader">
        <div className="selectedModelPredictionTitle">
          <span>{labels.prediction} · {metadata.name}</span>
          <small>{metadata.description[locale]}</small>
        </div>
        {showSelector ? <PredictionModelSelector compact locale={locale} /> : null}
      </div>
      <div className="predictionSummary">
        <div className="predictionSummaryCard isPick"><small>{labels.pick}</small><strong>{prediction.pick}</strong></div>
        <div className="predictionSummaryCard"><small>{labels.score}</small><strong>{prediction.score}</strong></div>
        <div className="predictionSummaryCard isConfidence"><small>{labels.probability}</small><strong>{prediction.confidence}%</strong></div>
      </div>
      <section className="predictionProbabilitySection">
        <div className="predictionSectionHeading">
          <span>{locale === "de" ? "Siegwahrscheinlichkeiten" : "Win probabilities"}</span>
          <small>{locale === "de" ? "Verteilung dieses Modells" : "This model's distribution"}</small>
        </div>
        <ProbabilityBreakdown locale={locale} prediction={prediction} />
      </section>
      <div className="predictionReasoning">
        <span>{labels.reason}</span>
        <p>{prediction.reason}</p>
      </div>
      {children}
    </div>
  );
}

export function SelectedHomePrediction({
  labels,
  locale,
  variants
}: {
  labels: { prediction: string; probability: string; reason: string };
  locale: Locale;
  variants: ModelPredictionSet;
}) {
  const { model } = usePredictionModel();
  const prediction = variants[model];
  const metadata = getPredictionModel(model);

  return (
    <div className="homeHighlightPrediction selectedHomePrediction" style={{ "--model-accent": metadata.accent } as CSSProperties}>
      <span>{labels.prediction} · {metadata.name}</span>
      <strong>{prediction.pick}</strong>
      <small>{labels.probability}: {prediction.confidence}%</small>
      <ProbabilityBreakdown compact locale={locale} prediction={prediction} />
      <p><span>{labels.reason}</span> {prediction.reason}</p>
    </div>
  );
}

export function SelectedPredictionScore({
  actualScore,
  variants
}: {
  actualScore?: string | null;
  variants: ModelPredictionSet;
}) {
  const { model } = usePredictionModel();
  return <em>{actualScore ?? variants[model].score}</em>;
}

export function SelectedModelSignal({
  eyebrow,
  locale,
  staticSignals,
  variants
}: {
  eyebrow: string;
  locale: Locale;
  staticSignals: Array<{ label: string; text: string }>;
  variants: ModelPredictionSet;
}) {
  const { model } = usePredictionModel();
  const prediction = variants[model];
  const metadata = getPredictionModel(model);

  return (
    <section className="footballPanel matchDetailSignalPanel selectedModelSignal" style={{ "--model-accent": metadata.accent } as CSSProperties}>
      <div className="sportschauSectionTitle">
        <span>{eyebrow} · {metadata.name}</span>
        <h2>{prediction.pick}</h2>
      </div>
      <PredictionModelSelector locale={locale} />
      <div className="signalGrid">
        <article className="signalCard">
          <span />
          <h3>{locale === "de" ? "Tipp" : "Pick"}</h3>
          <p>{prediction.pick} · {prediction.score} · {prediction.confidence}%</p>
        </article>
        <article className="signalCard">
          <span />
          <h3>{locale === "de" ? "Modellgrund" : "Model reason"}</h3>
          <p>{prediction.reason}</p>
        </article>
        {staticSignals.map((signal) => (
          <article className="signalCard" key={signal.label}>
            <span />
            <h3>{signal.label}</h3>
            <p>{signal.text}</p>
          </article>
        ))}
      </div>
    </section>
  );
}

function ProbabilityBreakdown({
  compact = false,
  locale,
  prediction
}: {
  compact?: boolean;
  locale: Locale;
  prediction: ModelPredictionSet[PredictionModelId];
}) {
  const strongestProbability = Math.max(...prediction.probabilities.map((probability) => probability.value));

  return (
    <div className={`modelProbabilityBreakdown${compact ? " isCompact" : ""}`} aria-label={locale === "de" ? "Siegwahrscheinlichkeiten" : "Win probabilities"}>
      {prediction.probabilities.map((probability) => (
        <div className={probability.value === strongestProbability ? "isLeading" : undefined} key={probability.label}>
          <small>{probability.label === "draw" ? (locale === "de" ? "Remis" : "Draw") : probability.name}</small>
          <strong>{probability.value}%</strong>
          <span><i style={{ width: `${probability.value}%` }} /></span>
        </div>
      ))}
    </div>
  );
}

function isPredictionModelId(value: string | null): value is PredictionModelId {
  return value === "nexus" || value === "pulse" || value === "edge";
}
