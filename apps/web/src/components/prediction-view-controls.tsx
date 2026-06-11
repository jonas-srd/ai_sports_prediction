"use client";

/**
 * Purpose: Low-friction prediction filters for Home and Matches.
 * The advanced controls stay hidden until a user explicitly opts into customization.
 */
import { useEffect, useRef, useState } from "react";
import type {
  AccessCondition,
  ForecastHorizon,
  PromptStrategy
} from "@/lib/benchmark-analytics";
import { formatCondition } from "@/lib/benchmark-analytics";
import type { PredictionViewOptions, PredictionViewState } from "@/lib/prediction-view";
import type { Locale } from "@/lib/i18n";

type PredictionViewControlsProps = {
  locale: Locale;
  state: PredictionViewState;
  options: PredictionViewOptions;
  summary: string;
  onChange: (nextState: PredictionViewState) => void;
  variant?: "panel" | "embedded";
};

export function PredictionViewControls({
  state,
  options,
  summary,
  locale,
  onChange,
  variant = "panel"
}: PredictionViewControlsProps) {
  const wrapperRef = useRef<HTMLElement | null>(null);
  const [isExpanded, setIsExpanded] = useState(false);
  const showAdvancedControls = state.mode === "custom" && (variant === "panel" || isExpanded);
  const isCustomFiltered = showAdvancedControls && state.customMode === "filtered";

  useEffect(() => {
    if (state.mode !== "custom") {
      setIsExpanded(false);
    }
  }, [state.mode]);

  useEffect(() => {
    if (variant !== "embedded" || !isExpanded) {
      return;
    }

    const handlePointerDown = (event: PointerEvent) => {
      const target = event.target;
      if (target instanceof Node && wrapperRef.current?.contains(target)) {
        return;
      }

      setIsExpanded(false);
    };

    document.addEventListener("pointerdown", handlePointerDown);

    return () => document.removeEventListener("pointerdown", handlePointerDown);
  }, [isExpanded, variant]);

  const handleChange = (nextState: PredictionViewState) => {
    onChange(nextState);
    if (variant === "embedded" && nextState.mode === "custom") {
      setIsExpanded(true);
    }
  };
  const setWrapperRef = (node: HTMLElement | null) => {
    wrapperRef.current = node;
  };
  const text = PREDICTION_VIEW_TEXT[locale];

  if (variant === "embedded") {
    return (
      <div
        className={`predictionViewEmbedded${showAdvancedControls ? " hasAdvancedControls" : ""}`}
        aria-label={text.settingsLabel}
        ref={setWrapperRef}
      >
        <div className="predictionViewEmbeddedTop">
          <ViewModeSegment locale={locale} state={state} onChange={handleChange} />
        </div>
        {showAdvancedControls ? (
          <AdvancedPredictionControls
            isCustomFiltered={isCustomFiltered}
            locale={locale}
            options={options}
            state={state}
            onChange={handleChange}
          />
        ) : null}
      </div>
    );
  }

  return (
    <section className="panel predictionViewPanel" aria-label={text.settingsLabel} ref={setWrapperRef}>
      <div className="predictionViewHeader">
        <div>
          <p className="sectionKicker">{text.kicker}</p>
          <h2>{text.title}</h2>
          <p>
            {text.description}
          </p>
        </div>
        <span className="tableSummary">{summary}</span>
      </div>

      <ViewModeSegment locale={locale} state={state} onChange={handleChange} />
      {showAdvancedControls ? (
        <AdvancedPredictionControls
          isCustomFiltered={isCustomFiltered}
          locale={locale}
          options={options}
          state={state}
          onChange={handleChange}
        />
      ) : null}
    </section>
  );
}

type ViewModeSegmentProps = {
  locale: Locale;
  state: PredictionViewState;
  onChange: (nextState: PredictionViewState) => void;
};

function ViewModeSegment({ locale, state, onChange }: ViewModeSegmentProps) {
  const text = PREDICTION_VIEW_TEXT[locale];

  return (
    <div className="segmentedControl" role="group" aria-label={text.modeLabel}>
      <button
        aria-pressed={state.mode === "best"}
        className={state.mode === "best" ? "isActive" : ""}
        type="button"
        onClick={() => onChange({ ...state, mode: "best" })}
      >
        {text.bestPerModel}
      </button>
      <button
        aria-pressed={state.mode === "custom"}
        className={state.mode === "custom" ? "isActive" : ""}
        type="button"
        onClick={() => onChange({ ...state, mode: "custom" })}
      >
        {text.customize}
      </button>
    </div>
  );
}

type AdvancedPredictionControlsProps = {
  isCustomFiltered: boolean;
  locale: Locale;
  state: PredictionViewState;
  options: PredictionViewOptions;
  onChange: (nextState: PredictionViewState) => void;
};

function AdvancedPredictionControls({
  isCustomFiltered,
  locale,
  state,
  options,
  onChange
}: AdvancedPredictionControlsProps) {
  if (state.mode !== "custom") {
    return null;
  }
  const text = PREDICTION_VIEW_TEXT[locale];

  return (
    <div className="advancedPredictionControls">
      <div className="segmentedControl secondarySegmentedControl" role="group" aria-label={text.customModeLabel}>
        <button
          aria-pressed={state.customMode === "all"}
          className={state.customMode === "all" ? "isActive" : ""}
          type="button"
          onClick={() => onChange({ ...state, customMode: "all" })}
        >
          {text.allStrategies}
        </button>
        <button
          aria-pressed={state.customMode === "filtered"}
          className={state.customMode === "filtered" ? "isActive" : ""}
          type="button"
          onClick={() => onChange({ ...state, customMode: "filtered" })}
        >
          {text.chooseFilters}
        </button>
      </div>

      {isCustomFiltered ? (
        <div className="predictionFilterGrid">
          <MultiSelectGroup
            clearLabel={text.clear}
            label={text.models}
            selectAllLabel={text.selectAll}
            values={options.models}
            selected={state.models}
            formatValue={(value) => value}
            onChange={(models) => onChange({ ...state, models })}
          />
          <MultiSelectGroup
            clearLabel={text.clear}
            label={text.access}
            selectAllLabel={text.selectAll}
            values={options.accessConditions}
            selected={state.accessConditions}
            formatValue={formatCondition}
            onChange={(accessConditions) => onChange({ ...state, accessConditions })}
          />
          <MultiSelectGroup
            clearLabel={text.clear}
            label={text.prompt}
            selectAllLabel={text.selectAll}
            values={options.promptStrategies}
            selected={state.promptStrategies}
            formatValue={formatCondition}
            onChange={(promptStrategies) => onChange({ ...state, promptStrategies })}
          />
          <MultiSelectGroup
            clearLabel={text.clear}
            label={text.horizon}
            selectAllLabel={text.selectAll}
            values={options.forecastHorizons}
            selected={state.forecastHorizons}
            formatValue={(value) => value}
            onChange={(forecastHorizons) => onChange({ ...state, forecastHorizons })}
          />
        </div>
      ) : (
        <p className="advancedPredictionHint">
          {text.allStrategiesHint}
        </p>
      )}
    </div>
  );
}

type MultiSelectGroupProps<T extends AccessCondition | PromptStrategy | ForecastHorizon | string> = {
  clearLabel: string;
  label: string;
  selectAllLabel: string;
  values: T[];
  selected: T[];
  formatValue: (value: T) => string;
  onChange: (selected: T[]) => void;
};

function MultiSelectGroup<T extends AccessCondition | PromptStrategy | ForecastHorizon | string>({
  clearLabel,
  label,
  selectAllLabel,
  values,
  selected,
  formatValue,
  onChange
}: MultiSelectGroupProps<T>) {
  const allSelected = values.length > 0 && selected.length === values.length;

  return (
    <fieldset className="predictionFilterGroup">
      <legend>{label}</legend>
      <button
        className="filterSelectAllButton"
        type="button"
        onClick={() => onChange(allSelected ? [] : values)}
      >
        {allSelected ? clearLabel : selectAllLabel}
      </button>
      <div className="filterChipGrid">
        {values.map((value) => {
          const isChecked = selected.includes(value);
          const id = `${label}-${value}`.replace(/[^a-z0-9_-]+/gi, "-");

          return (
            <label className={`filterChip${isChecked ? " isChecked" : ""}`} htmlFor={id} key={value}>
              <input
                checked={isChecked}
                id={id}
                type="checkbox"
                onChange={() => onChange(toggleValue(selected, value))}
              />
              <span>{formatValue(value)}</span>
            </label>
          );
        })}
      </div>
    </fieldset>
  );
}

const PREDICTION_VIEW_TEXT = {
  en: {
    settingsLabel: "Prediction display settings",
    kicker: "Prediction view",
    title: "Simple by default",
    description: "Best per model keeps the page readable. Customize only if you want to inspect benchmark strategies.",
    modeLabel: "Prediction view mode",
    bestPerModel: "Best per model",
    customize: "Customize",
    customModeLabel: "Custom strategy mode",
    allStrategies: "All strategies",
    chooseFilters: "Choose filters",
    models: "Models",
    access: "Access",
    prompt: "Prompt",
    horizon: "Horizon",
    clear: "Clear",
    selectAll: "Select all",
    allStrategiesHint: "Showing every access, prompt, and horizon variant, matching the full benchmark view."
  },
  de: {
    settingsLabel: "Anzeigeeinstellungen für Vorhersagen",
    kicker: "Vorhersageansicht",
    title: "Standardmäßig einfach",
    description: "Bestes Setup pro Modell hält die Seite lesbar. Passe die Ansicht nur an, wenn du Benchmark-Strategien untersuchen willst.",
    modeLabel: "Modus der Vorhersageansicht",
    bestPerModel: "Bestes pro Modell",
    customize: "Anpassen",
    customModeLabel: "Benutzerdefinierter Strategiemodus",
    allStrategies: "Alle Strategien",
    chooseFilters: "Filter wählen",
    models: "Modelle",
    access: "Zugriff",
    prompt: "Prompt",
    horizon: "Horizont",
    clear: "Leeren",
    selectAll: "Alle wählen",
    allStrategiesHint: "Zeigt alle Zugriffs-, Prompt- und Horizontvarianten wie in der vollständigen Benchmark-Ansicht."
  }
} as const;

function toggleValue<T extends string>(values: T[], value: T): T[] {
  if (values.includes(value)) {
    return values.filter((entry) => entry !== value);
  }

  return [...values, value];
}
