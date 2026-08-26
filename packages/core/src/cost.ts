/** Onboarding cost rollup: licences + per-app costs + one-off hardware, expressed monthly and first-year. */

export interface CostLine {
  label: string;
  /** recurring monthly cost in the org currency */
  monthly?: number;
  /** one-off cost (hardware, setup) */
  oneOff?: number;
  category: "licence" | "hardware" | "service" | "other";
}

export interface CostSummary {
  monthly: number;
  oneOff: number;
  firstYear: number;
  byCategory: Record<CostLine["category"], { monthly: number; oneOff: number }>;
}

export function rollupCost(lines: CostLine[]): CostSummary {
  const byCategory: CostSummary["byCategory"] = {
    licence: { monthly: 0, oneOff: 0 },
    hardware: { monthly: 0, oneOff: 0 },
    service: { monthly: 0, oneOff: 0 },
    other: { monthly: 0, oneOff: 0 },
  };
  let monthly = 0;
  let oneOff = 0;
  for (const l of lines) {
    const m = l.monthly ?? 0;
    const o = l.oneOff ?? 0;
    monthly += m;
    oneOff += o;
    byCategory[l.category].monthly += m;
    byCategory[l.category].oneOff += o;
  }
  const round = (n: number) => Math.round(n * 100) / 100;
  return {
    monthly: round(monthly),
    oneOff: round(oneOff),
    firstYear: round(monthly * 12 + oneOff),
    byCategory,
  };
}
