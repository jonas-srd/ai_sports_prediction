import type { WidgetType } from "@/lib/widget-data";

export type WidgetPlan = "starter" | "growth" | "enterprise";

export type WidgetPlanRules = {
  allowedTypes: WidgetType[];
  domainLimit: number;
  maxItems: number;
  monthlyRequestLimit: number;
};

export const WIDGET_PLAN_RULES: Record<WidgetPlan, WidgetPlanRules> = {
  starter: {
    allowedTypes: ["prediction-card", "match-list", "win-probability"],
    domainLimit: 2,
    maxItems: 3,
    monthlyRequestLimit: 50_000
  },
  growth: {
    allowedTypes: ["prediction-card", "match-list", "win-probability", "key-factors"],
    domainLimit: 8,
    maxItems: 8,
    monthlyRequestLimit: 250_000
  },
  enterprise: {
    allowedTypes: ["prediction-card", "match-list", "win-probability", "key-factors"],
    domainLimit: 25,
    maxItems: 12,
    monthlyRequestLimit: 1_000_000
  }
};

export function getWidgetPlanRules(plan: WidgetPlan): WidgetPlanRules {
  return WIDGET_PLAN_RULES[plan] ?? WIDGET_PLAN_RULES.starter;
}
