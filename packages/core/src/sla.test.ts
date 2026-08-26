import { describe, expect, it } from "vitest";
import { addBusinessMinutes, businessMinutesBetween, computeSlaTarget, HK_BUSINESS_HOURS, type BusinessCalendar } from "./sla";

// Helper: HK local time → UTC ms
const hk = (iso: string) => Date.parse(`${iso}+08:00`);

describe("businessMinutesBetween", () => {
  it("counts only business hours within one day", () => {
    expect(businessMinutesBetween(hk("2026-08-24T10:00:00"), hk("2026-08-24T12:30:00"), HK_BUSINESS_HOURS)).toBe(150);
  });
  it("clips to opening hours", () => {
    expect(businessMinutesBetween(hk("2026-08-24T07:00:00"), hk("2026-08-24T10:00:00"), HK_BUSINESS_HOURS)).toBe(60);
    expect(businessMinutesBetween(hk("2026-08-24T17:00:00"), hk("2026-08-24T22:00:00"), HK_BUSINESS_HOURS)).toBe(60);
  });
  it("skips weekends", () => {
    // Fri 17:00 → Mon 10:00 = 60 + 60
    expect(businessMinutesBetween(hk("2026-08-21T17:00:00"), hk("2026-08-24T10:00:00"), HK_BUSINESS_HOURS)).toBe(120);
  });
  it("skips holidays", () => {
    const cal: BusinessCalendar = { ...HK_BUSINESS_HOURS, holidays: ["2026-08-25"] };
    expect(businessMinutesBetween(hk("2026-08-24T17:00:00"), hk("2026-08-26T10:00:00"), cal)).toBe(120);
  });
  it("returns 0 for reversed or equal ranges", () => {
    expect(businessMinutesBetween(100, 100, HK_BUSINESS_HOURS)).toBe(0);
    expect(businessMinutesBetween(200, 100, HK_BUSINESS_HOURS)).toBe(0);
  });
  it("subtracts pauses, including open-ended ones", () => {
    const from = hk("2026-08-24T09:00:00");
    const to = hk("2026-08-24T13:00:00");
    expect(businessMinutesBetween(from, to, HK_BUSINESS_HOURS, [{ from: hk("2026-08-24T10:00:00"), to: hk("2026-08-24T11:00:00") }])).toBe(180);
    expect(businessMinutesBetween(from, to, HK_BUSINESS_HOURS, [{ from: hk("2026-08-24T12:00:00"), to: null }])).toBe(180);
  });
});

describe("addBusinessMinutes", () => {
  it("adds within the day", () => {
    expect(addBusinessMinutes(hk("2026-08-24T10:00:00"), 90, HK_BUSINESS_HOURS)).toBe(hk("2026-08-24T11:30:00"));
  });
  it("rolls over to the next working day", () => {
    expect(addBusinessMinutes(hk("2026-08-21T17:30:00"), 60, HK_BUSINESS_HOURS)).toBe(hk("2026-08-24T09:30:00"));
  });
  it("starts at opening when raised before hours", () => {
    expect(addBusinessMinutes(hk("2026-08-24T06:00:00"), 30, HK_BUSINESS_HOURS)).toBe(hk("2026-08-24T09:30:00"));
  });
  it("returns the input for zero minutes", () => {
    expect(addBusinessMinutes(123, 0, HK_BUSINESS_HOURS)).toBe(123);
  });
  it("throws when the calendar has no working days", () => {
    expect(() => addBusinessMinutes(0, 10, { ...HK_BUSINESS_HOURS, days: [] })).toThrow();
  });
});

describe("computeSlaTarget", () => {
  const opened = hk("2026-08-24T10:00:00");
  it("reports ok early in the allowance", () => {
    const t = computeSlaTarget(opened, 240, hk("2026-08-24T10:30:00"), HK_BUSINESS_HOURS);
    expect(t.status).toBe("ok");
    expect(t.remainingMinutes).toBe(210);
    expect(t.dueAt).toBe(hk("2026-08-24T14:00:00"));
  });
  it("reports at_risk past 75%", () => {
    const t = computeSlaTarget(opened, 240, hk("2026-08-24T13:10:00"), HK_BUSINESS_HOURS);
    expect(t.status).toBe("at_risk");
  });
  it("reports breached after the allowance", () => {
    const t = computeSlaTarget(opened, 240, hk("2026-08-24T15:00:00"), HK_BUSINESS_HOURS);
    expect(t.status).toBe("breached");
    expect(t.remainingMinutes).toBe(-60);
    expect(t.consumed).toBe(1);
  });
  it("reports met when resolved in time, breached when late", () => {
    expect(computeSlaTarget(opened, 240, hk("2026-08-25T09:00:00"), HK_BUSINESS_HOURS, { metAtMs: hk("2026-08-24T12:00:00") }).status).toBe("met");
    expect(computeSlaTarget(opened, 240, hk("2026-08-25T09:00:00"), HK_BUSINESS_HOURS, { metAtMs: hk("2026-08-24T16:00:00") }).status).toBe("breached");
  });
  it("shifts the due date by paused time and is never at_risk while paused", () => {
    const pauses = [{ from: hk("2026-08-24T11:00:00"), to: null }];
    const t = computeSlaTarget(opened, 240, hk("2026-08-24T16:00:00"), HK_BUSINESS_HOURS, { pauses });
    expect(t.status).toBe("ok");
    expect(t.remainingMinutes).toBe(180);
    expect(t.dueAt).toBe(hk("2026-08-25T10:00:00"));
  });
  it("uses calendar hours when requested", () => {
    const t = computeSlaTarget(hk("2026-08-22T10:00:00"), 240, hk("2026-08-22T12:00:00"), HK_BUSINESS_HOURS, { calendarHours: true });
    expect(t.remainingMinutes).toBe(120);
    expect(t.dueAt).toBe(hk("2026-08-22T14:00:00"));
  });
});
