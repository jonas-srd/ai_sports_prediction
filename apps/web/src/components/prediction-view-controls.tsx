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

type PredictionViewControlsProps = {
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

  if (variant === "embedded") {
    return (
      <div className="predictionViewEmbedded" aria-label="Prediction display settings" ref={setWrapperRef}>
        <div className="predictionViewEmbeddedTop">
          <ViewModeSegment state={state} onChange={handleChange} />
        </div>
        {showAdvancedControls ? (
          <AdvancedPredictionControls
            isCustomFiltered={isCustomFiltered}
            options={options}
            state={state}
            onChange={handleChange}
          />
        ) : null}
      </div>
    );
  }

  return (
    <section className="panel predictionViewPanel" aria-label="Prediction display settings" ref={setWrapperRef}>
      <div className="predictionViewHeader">
        <div>
          <p className="sectionKicker">Prediction view</p>
          <h2>Simple by default</h2>
          <p>
            Best per model keeps the page readable. Customize only if you want to inspect benchmark strategies.
          </p>
        </div>
        <span className="tableSummary">{summary}</span>
      </div>

      <ViewModeSegment state={state} onChange={handleChange} />
      {showAdvancedControls ? (
        <AdvancedPredictionControls
          isCustomFiltered={isCustomFiltered}
          options={options}
          state={state}
          onChange={handleChange}
        />
      ) : null}
    </section>
  );
}

type ViewModeSegmentProps = {
  state: PredictionViewState;
  onChange: (nextState: PredictionViewState) => void;
};

function ViewModeSegment({ state, onChange }: ViewModeSegmentProps) {
  return (
    <div className="segmentedControl" role="group" aria-label="Prediction view mode">
      <button
        aria-pressed={state.mode === "best"}
        className={state.mode === "best" ? "isActive" : ""}
        type="button"
        onClick={() => onChange({ ...state, mode: "best" })}
      >
        Best per model
      </button>
      <button
        aria-pressed={state.mode === "custom"}
        className={state.mode === "custom" ? "isActive" : ""}
        type="button"
        onClick={() => onChange({ ...state, mode: "custom" })}
      >
        Customize
      </button>
    </div>
  );
}

type AdvancedPredictionControlsProps = {
  isCustomFiltered: boolean;
  state: PredictionViewState;
  options: PredictionViewOptions;
  onChange: (nextState: PredictionViewState) => void;
};

function AdvancedPredictionControls({
  isCustomFiltered,
  state,
  options,
  onChange
}: AdvancedPredictionControlsProps) {
  if (state.mode !== "custom") {
    return null;
  }

  return (
    <div className="advancedPredictionControls">
      <div className="segmentedControl secondarySegmentedControl" role="group" aria-label="Custom strategy mode">
        <button
          aria-pressed={state.customMode === "all"}
          className={state.customMode === "all" ? "isActive" : ""}
          type="button"
          onClick={() => onChange({ ...state, customMode: "all" })}
        >
          All strategies
        </button>
        <button
          aria-pressed={state.customMode === "filtered"}
          className={state.customMode === "filtered" ? "isActive" : ""}
          type="button"
          onClick={() => onChange({ ...state, customMode: "filtered" })}
        >
          Choose filters
        </button>
      </div>

      {isCustomFiltered ? (
        <div className="predictionFilterGrid">
          <MultiSelectGroup
            label="Models"
            values={options.models}
            selected={state.models}
            formatValue={(value) => value}
            onChange={(models) => onChange({ ...state, models })}
          />
          <MultiSelectGroup
            label="Access"
            values={options.accessConditions}
            selected={state.accessConditions}
            formatValue={formatCondition}
            onChange={(accessConditions) => onChange({ ...state, accessConditions })}
          />
          <MultiSelectGroup
            label="Prompt"
            values={options.promptStrategies}
            selected={state.promptStrategies}
            formatValue={formatCondition}
            onChange={(promptStrategies) => onChange({ ...state, promptStrategies })}
          />
          <MultiSelectGroup
            label="Horizon"
            values={options.forecastHorizons}
            selected={state.forecastHorizons}
            formatValue={(value) => value}
            onChange={(forecastHorizons) => onChange({ ...state, forecastHorizons })}
          />
        </div>
      ) : (
        <p className="advancedPredictionHint">
          Showing every access, prompt, and horizon variant, matching the full benchmark view.
        </p>
      )}
    </div>
  );
}

type MultiSelectGroupProps<T extends AccessCondition | PromptStrategy | ForecastHorizon | string> = {
  label: string;
  values: T[];
  selected: T[];
  formatValue: (value: T) => string;
  onChange: (selected: T[]) => void;
};

function MultiSelectGroup<T extends AccessCondition | PromptStrategy | ForecastHorizon | string>({
  label,
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
        {allSelected ? "Clear" : "Select all"}
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

function toggleValue<T extends string>(values: T[], value: T): T[] {
  if (values.includes(value)) {
    return values.filter((entry) => entry !== value);
  }

  return [...values, value];
}
