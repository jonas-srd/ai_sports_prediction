import type { ForecastHorizon } from "@/lib/benchmark-analytics";
import type { Locale } from "@/lib/i18n";

export const CLAUDE_FABLE_DYNAMIC_CUTOFF_DATE = "2026-06-17";

export type ModelWarningInput = {
  model?: string | null;
  predictorId?: string | null;
  forecastHorizon?: ForecastHorizon | string | null;
};

export type ModelWarning = {
  label: string;
  text: string;
};

export function getModelWarning(input: ModelWarningInput, locale: Locale): ModelWarning | null {
  if (!isClaudeFableDynamicHorizon(input)) {
    return null;
  }

  return locale === "de"
    ? {
      label: "Teilabdeckung",
      text: "Claude Fable 5 T_24H/T_2H nutzt nur Teilprognosen, da der Modellzugriff ab 17. Juni 2026 deaktiviert war."
    }
    : {
      label: "Partial coverage",
      text: "Claude Fable 5 T_24H/T_2H uses partial predictions only because model access was disabled from June 17, 2026."
    };
}

export function hasModelWarning(input: ModelWarningInput): boolean {
  return isClaudeFableDynamicHorizon(input);
}

function isClaudeFableDynamicHorizon(input: ModelWarningInput): boolean {
  const modelKey = `${input.model ?? ""} ${input.predictorId ?? ""}`.toLowerCase();
  return modelKey.includes("fable")
    && (input.forecastHorizon === "T_24H" || input.forecastHorizon === "T_2H");
}
