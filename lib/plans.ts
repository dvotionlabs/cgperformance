export type PlanFrequency = 1 | 2 | 3 | 4;

export interface PlanDefinition {
  frequency: PlanFrequency;
  label: string;
  pricePerSession: number;
  weeksPerMonth: number;
  monthlyPrice: number;
}

// Mirrors the `plans` table in supabase/schema.sql — flat £50/session,
// priced on a 4-week month. Keep this in sync if the schema seed changes.
export const PLANS: PlanDefinition[] = [1, 2, 3, 4].map((frequency) => {
  const pricePerSession = 50;
  const weeksPerMonth = 4;
  return {
    frequency: frequency as PlanFrequency,
    label: `${frequency}x / week`,
    pricePerSession,
    weeksPerMonth,
    monthlyPrice: frequency * pricePerSession * weeksPerMonth,
  };
});

export function planByFrequency(frequency: number): PlanDefinition | undefined {
  return PLANS.find((p) => p.frequency === frequency);
}

export function formatGBP(amount: number): string {
  return new Intl.NumberFormat("en-GB", {
    style: "currency",
    currency: "GBP",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
}
