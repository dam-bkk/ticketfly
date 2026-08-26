import { computeSlaTarget, DEFAULT_SLA, HK_BUSINESS_HOURS, isSlaPaused, type TicketPriority, type TicketStatus } from "@ticketfly/core";

export type SlaView = {
  status: "ok" | "at_risk" | "breached" | "met" | "paused" | "n/a";
  remainingMinutes: number;
  consumed: number;
  dueAt: Date;
  label: string;
};

export function slaFor(t: {
  status: TicketStatus;
  priority: TicketPriority;
  createdAt: Date;
  firstRespondedAt: Date | null;
  resolvedAt: Date | null;
  slaPausedSince: Date | null;
  slaPausedMinutes: number;
}, clock: "first_response" | "resolution", now = new Date()): SlaView {
  const policy = DEFAULT_SLA[t.priority];
  const allowance = clock === "first_response" ? policy.firstResponseMinutes : policy.resolutionMinutes;
  const metAt = clock === "first_response" ? t.firstRespondedAt : t.resolvedAt;
  if (t.status === "closed" && !metAt) return { status: "n/a", remainingMinutes: 0, consumed: 0, dueAt: t.createdAt, label: "—" };
  const pauses = t.slaPausedSince ? [{ from: t.slaPausedSince.getTime(), to: null }] : [];
  const r = computeSlaTarget(t.createdAt.getTime(), allowance, now.getTime(), HK_BUSINESS_HOURS, { pauses, metAtMs: metAt?.getTime() ?? null, calendarHours: policy.calendarHours });
  const paused = !metAt && isSlaPaused(t.status);
  let label: string;
  if (r.status === "met") label = "Met";
  else if (r.status === "breached") label = metAt ? "Breached" : `${fmt(-r.remainingMinutes)} over`;
  else if (paused) label = "Paused";
  else label = `${fmt(r.remainingMinutes)} left`;
  return { status: paused ? "paused" : r.status, remainingMinutes: r.remainingMinutes, consumed: r.consumed, dueAt: new Date(r.dueAt), label };
}

function fmt(m: number): string {
  const abs = Math.abs(Math.round(m));
  if (abs < 60) return `${abs}m`;
  if (abs < 1440) return `${Math.floor(abs / 60)}h${abs % 60 ? ` ${abs % 60}m` : ""}`;
  return `${Math.floor(abs / 1440)}d ${Math.floor((abs % 1440) / 60)}h`;
}
