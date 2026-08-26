/**
 * SLA clock maths. Pure functions, no I/O.
 * Times are epoch milliseconds in UTC; the calendar carries its own IANA offset in minutes
 * (we deliberately avoid Intl here so the maths is deterministic and unit-testable).
 */

export type Weekday = 0 | 1 | 2 | 3 | 4 | 5 | 6; // 0 = Sunday

export interface BusinessCalendar {
  /** Offset from UTC in minutes, e.g. Hong Kong = 480 */
  utcOffsetMinutes: number;
  /** Working days */
  days: Weekday[];
  /** Start of business in minutes from local midnight, e.g. 9:00 = 540 */
  startMinutes: number;
  /** End of business in minutes from local midnight, e.g. 18:00 = 1080 */
  endMinutes: number;
  /** ISO dates (YYYY-MM-DD, local) that are holidays */
  holidays?: string[];
}

export interface SlaPolicy {
  /** minutes of business time allowed before first response */
  firstResponseMinutes: number;
  /** minutes of business time allowed before resolution */
  resolutionMinutes: number;
  /** if true, count calendar time (24x7) instead of business hours */
  calendarHours?: boolean;
}

export interface PauseInterval {
  from: number;
  to: number | null; // null = still paused
}

const MINUTE = 60_000;
const DAY = 24 * 60 * MINUTE;

function toLocal(ms: number, cal: BusinessCalendar): number {
  return ms + cal.utcOffsetMinutes * MINUTE;
}
function fromLocal(local: number, cal: BusinessCalendar): number {
  return local - cal.utcOffsetMinutes * MINUTE;
}
function localDayStart(local: number): number {
  return Math.floor(local / DAY) * DAY;
}
function localWeekday(local: number): Weekday {
  // 1970-01-01 was a Thursday (4)
  return (((Math.floor(local / DAY) + 4) % 7) + 7) % 7 as Weekday;
}
function localIsoDate(local: number): string {
  return new Date(localDayStart(local)).toISOString().slice(0, 10);
}

function isWorkingDay(local: number, cal: BusinessCalendar): boolean {
  if (!cal.days.includes(localWeekday(local))) return false;
  if (cal.holidays?.includes(localIsoDate(local))) return false;
  return true;
}

/**
 * Business minutes elapsed between two instants, honouring calendar and pauses.
 */
export function businessMinutesBetween(
  fromMs: number,
  toMs: number,
  cal: BusinessCalendar,
  pauses: PauseInterval[] = [],
): number {
  if (toMs <= fromMs) return 0;
  let total = 0;
  let cursor = toLocal(fromMs, cal);
  const end = toLocal(toMs, cal);
  const localPauses = pauses.map((p) => ({
    from: toLocal(p.from, cal),
    to: p.to === null ? end : Math.min(toLocal(p.to, cal), end),
  }));

  while (cursor < end) {
    const dayStart = localDayStart(cursor);
    const open = dayStart + cal.startMinutes * MINUTE;
    const close = dayStart + cal.endMinutes * MINUTE;
    if (isWorkingDay(cursor, cal)) {
      const winStart = Math.max(cursor, open);
      const winEnd = Math.min(end, close);
      if (winEnd > winStart) {
        let span = winEnd - winStart;
        for (const p of localPauses) {
          const ovStart = Math.max(winStart, p.from);
          const ovEnd = Math.min(winEnd, p.to);
          if (ovEnd > ovStart) span -= ovEnd - ovStart;
        }
        total += span;
      }
    }
    cursor = dayStart + DAY;
  }
  return Math.round(total / MINUTE);
}

/**
 * Instant at which `minutes` of business time will have elapsed after `fromMs`.
 */
export function addBusinessMinutes(fromMs: number, minutes: number, cal: BusinessCalendar): number {
  if (minutes <= 0) return fromMs;
  let remaining = minutes * MINUTE;
  let cursor = toLocal(fromMs, cal);
  // Guard against a calendar with no working days.
  for (let guard = 0; guard < 3660; guard++) {
    const dayStart = localDayStart(cursor);
    const open = dayStart + cal.startMinutes * MINUTE;
    const close = dayStart + cal.endMinutes * MINUTE;
    if (isWorkingDay(cursor, cal) && cursor < close) {
      const start = Math.max(cursor, open);
      const available = close - start;
      if (available >= remaining) return fromLocal(start + remaining, cal);
      remaining -= available;
    }
    cursor = dayStart + DAY;
  }
  throw new Error("No working time found in calendar within 10 years");
}

export interface SlaTarget {
  dueAt: number;
  /** minutes of business time remaining at `nowMs`; negative once breached */
  remainingMinutes: number;
  /** 0..1 fraction of the allowance consumed, capped at 1 */
  consumed: number;
  status: "ok" | "at_risk" | "breached" | "met";
}

export function computeSlaTarget(
  openedAtMs: number,
  allowanceMinutes: number,
  nowMs: number,
  cal: BusinessCalendar,
  opts: { pauses?: PauseInterval[]; metAtMs?: number | null; calendarHours?: boolean; atRiskBelow?: number } = {},
): SlaTarget {
  const pauses = opts.pauses ?? [];
  const calendarCal: BusinessCalendar = { utcOffsetMinutes: cal.utcOffsetMinutes, days: [0, 1, 2, 3, 4, 5, 6], startMinutes: 0, endMinutes: 1440 };
  const effective = opts.calendarHours ? calendarCal : cal;
  const measureUntil = opts.metAtMs ?? nowMs;
  const elapsed = businessMinutesBetween(openedAtMs, measureUntil, effective, pauses);
  const remaining = allowanceMinutes - elapsed;
  const consumed = Math.min(1, Math.max(0, elapsed / allowanceMinutes));
  const pausedNow = pauses.some((p) => p.to === null);
  // Due date shifts by paused business time so far.
  const pausedMinutes = elapsed >= 0 ? businessMinutesBetween(openedAtMs, measureUntil, effective) - elapsed : 0;
  const dueAt = addBusinessMinutes(openedAtMs, allowanceMinutes + pausedMinutes, effective);
  let status: SlaTarget["status"];
  if (opts.metAtMs) status = remaining >= 0 ? "met" : "breached";
  else if (remaining < 0) status = "breached";
  else if (!pausedNow && consumed >= (opts.atRiskBelow ?? 0.75)) status = "at_risk";
  else status = "ok";
  return { dueAt, remainingMinutes: remaining, consumed, status };
}

export const HK_BUSINESS_HOURS: BusinessCalendar = {
  utcOffsetMinutes: 480,
  days: [1, 2, 3, 4, 5],
  startMinutes: 9 * 60,
  endMinutes: 18 * 60,
};

/** Priority → allowance in business minutes. */
export const DEFAULT_SLA: Record<"urgent" | "high" | "medium" | "low", SlaPolicy> = {
  urgent: { firstResponseMinutes: 30, resolutionMinutes: 4 * 60, calendarHours: true },
  high: { firstResponseMinutes: 60, resolutionMinutes: 8 * 60 },
  medium: { firstResponseMinutes: 4 * 60, resolutionMinutes: 3 * 9 * 60 },
  low: { firstResponseMinutes: 8 * 60, resolutionMinutes: 5 * 9 * 60 },
};
