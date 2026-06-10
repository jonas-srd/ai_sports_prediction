"use client";

/**
 * Purpose: Low-friction prediction filters for Home and Matches.
 * The advanced controls stay hidden until a user explicitly opts into customization.
 */
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
};

export function PredictionViewControls({
  state,
  options,
  summary,
  onChange
}: PredictionViewControlsProps) {
  const isCustomFiltered = state.mode === "custom" && state.customMode === "filtered";

  return (
    <section className="panel predictionViewPanel" aria-label="Prediction display settings">
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

      {state.mode === "custom" ? (
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
      ) : null}
    </section>
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
