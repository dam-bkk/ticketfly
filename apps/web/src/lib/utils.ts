import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";
import { formatDistanceToNowStrict, format, isToday, isYesterday, differenceInCalendarDays } from "date-fns";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function initials(name: string): string {
  const parts = name.trim().split(/\s+/);
  return ((parts[0]?.[0] ?? "") + (parts.length > 1 ? parts[parts.length - 1]?.[0] ?? "" : "")).toUpperCase();
}

/** Stable hue from a string, used for avatar tints. */
export function hueFor(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) | 0;
  return Math.abs(h) % 360;
}

export function relTime(d: Date | string | null | undefined): string {
  if (!d) return "—";
  const date = typeof d === "string" ? new Date(d) : d;
  return formatDistanceToNowStrict(date, { addSuffix: true }).replace("minutes", "min").replace("minute", "min").replace("seconds", "s").replace("second", "s");
}

export function shortTime(d: Date | string | null | undefined): string {
  if (!d) return "—";
  const date = typeof d === "string" ? new Date(d) : d;
  if (isToday(date)) return format(date, "HH:mm");
  if (isYesterday(date)) return `Yesterday ${format(date, "HH:mm")}`;
  if (differenceInCalendarDays(new Date(), date) < 180) return format(date, "d MMM, HH:mm");
  return format(date, "d MMM yyyy");
}

export function longTime(d: Date | string | null | undefined): string {
  if (!d) return "—";
  const date = typeof d === "string" ? new Date(d) : d;
  return format(date, "EEE d MMM yyyy, HH:mm");
}

export function dayLabel(d: Date | string): string {
  const date = typeof d === "string" ? new Date(d) : d;
  if (isToday(date)) return "Today";
  if (isYesterday(date)) return "Yesterday";
  return format(date, "EEEE d MMMM yyyy");
}

export function minutesLabel(m: number): string {
  const abs = Math.abs(m);
  if (abs < 60) return `${abs}m`;
  if (abs < 60 * 24) return `${Math.floor(abs / 60)}h ${abs % 60 ? `${abs % 60}m` : ""}`.trim();
  return `${Math.floor(abs / 1440)}d ${Math.floor((abs % 1440) / 60)}h`;
}

export function money(n: number | string | null | undefined, currency = "USD"): string {
  const v = typeof n === "string" ? Number(n) : (n ?? 0);
  return new Intl.NumberFormat("en-US", { style: "currency", currency, maximumFractionDigits: v % 1 === 0 ? 0 : 2 }).format(v);
}

export function pct(n: number): string {
  return `${Math.round(n * 100)}%`;
}

export const STATUS_LABEL: Record<string, string> = {
  open: "Open",
  pending: "Waiting on requester",
  in_progress: "In progress",
  on_hold: "On hold",
  resolved: "Resolved",
  closed: "Closed",
};
export const STATUS_SHORT: Record<string, string> = { open: "Open", pending: "Waiting", in_progress: "In progress", on_hold: "On hold", resolved: "Resolved", closed: "Closed" };
export const PRIORITY_LABEL: Record<string, string> = { low: "Low", medium: "Medium", high: "High", urgent: "Urgent" };
export const KIND_LABEL: Record<string, string> = { incident: "Incident", request: "Request", onboarding: "Onboarding", offboarding: "Offboarding", access: "Access", change: "Change" };
