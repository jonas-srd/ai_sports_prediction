export type RevenueCustomer = {
  billing_interval: "annual" | "monthly" | null;
  plan: string;
  status: string;
};

const MONTHLY_CENTS = { growth: 14_900, starter: 4_900 } as const;
const ANNUAL_CENTS = { growth: 163_900, starter: 53_900 } as const;

export function monthlyRecurringRevenueCents(customers: RevenueCustomer[]): number {
  return Math.round(customers.reduce((total, customer) => {
    if (customer.status !== "active" || (customer.plan !== "starter" && customer.plan !== "growth")) {
      return total;
    }
    return total + (customer.billing_interval === "annual"
      ? ANNUAL_CENTS[customer.plan] / 12
      : MONTHLY_CENTS[customer.plan]);
  }, 0));
}

export function percentage(numerator: number, denominator: number): number {
  return denominator > 0 ? Math.round((numerator / denominator) * 10_000) / 100 : 0;
}
