import { describe, expect, it } from "vitest";
import { rollupCost } from "./cost";

describe("rollupCost", () => {
  it("sums monthly, one-off and first-year by category", () => {
    const s = rollupCost([
      { label: "M365 E3", monthly: 36, category: "licence" },
      { label: "Adobe CC", monthly: 59.99, category: "licence" },
      { label: "MacBook Pro 14", oneOff: 2399, category: "hardware" },
      { label: "Desk setup", oneOff: 150.5, category: "service" },
      { label: "Misc", category: "other" },
    ]);
    expect(s.monthly).toBe(95.99);
    expect(s.oneOff).toBe(2549.5);
    expect(s.firstYear).toBe(3701.38);
    expect(s.byCategory.licence.monthly).toBeCloseTo(95.99);
    expect(s.byCategory.hardware.oneOff).toBe(2399);
    expect(s.byCategory.other).toEqual({ monthly: 0, oneOff: 0 });
  });
  it("handles empty input", () => {
    expect(rollupCost([])).toMatchObject({ monthly: 0, oneOff: 0, firstYear: 0 });
  });
});
