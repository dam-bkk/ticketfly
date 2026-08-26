/** Ticket domain: statuses, priority matrix, legacy reference parsing. */

export const TICKET_STATUSES = ["open", "pending", "in_progress", "on_hold", "resolved", "closed"] as const;
export type TicketStatus = (typeof TICKET_STATUSES)[number];

export const TICKET_PRIORITIES = ["low", "medium", "high", "urgent"] as const;
export type TicketPriority = (typeof TICKET_PRIORITIES)[number];

export const TICKET_KINDS = ["incident", "request", "onboarding", "offboarding", "access", "change"] as const;
export type TicketKind = (typeof TICKET_KINDS)[number];

/** Allowed transitions. Closed is terminal except reopen → open. */
const TRANSITIONS: Record<TicketStatus, readonly TicketStatus[]> = {
  open: ["pending", "in_progress", "on_hold", "resolved"],
  pending: ["open", "in_progress", "on_hold", "resolved"],
  in_progress: ["pending", "on_hold", "resolved"],
  on_hold: ["open", "in_progress", "resolved"],
  resolved: ["closed", "open"],
  closed: ["open"],
};

export function canTransition(from: TicketStatus, to: TicketStatus): boolean {
  return TRANSITIONS[from].includes(to);
}

export function nextStatuses(from: TicketStatus): readonly TicketStatus[] {
  return TRANSITIONS[from];
}

/** Statuses during which SLA clocks are paused (waiting on requester / third party). */
export const SLA_PAUSED_STATUSES: readonly TicketStatus[] = ["pending", "on_hold"];

export function isSlaPaused(status: TicketStatus): boolean {
  return SLA_PAUSED_STATUSES.includes(status);
}

/** ITIL-style impact × urgency → priority. */
export type Impact = "low" | "medium" | "high";
export type Urgency = "low" | "medium" | "high";

export function priorityFromMatrix(impact: Impact, urgency: Urgency): TicketPriority {
  const score = { low: 1, medium: 2, high: 3 };
  const s = score[impact] + score[urgency];
  if (s >= 6) return "urgent";
  if (s === 5) return "high";
  if (s === 4) return "medium";
  return "low";
}

/** Legacy Freshservice references: INC-123, SR-45, CHG-9 — in subjects, URLs or free text. */
const LEGACY_RE = /\b(INC|SR|CHG|PRB|REL)-(\d{1,8})\b/i;

export interface LegacyRef {
  prefix: "INC" | "SR" | "CHG" | "PRB" | "REL";
  number: number;
  ref: string;
}

export function parseLegacyRef(text: string): LegacyRef | null {
  const m = LEGACY_RE.exec(text);
  if (!m) return null;
  const prefix = (m[1] as string).toUpperCase() as LegacyRef["prefix"];
  const number = Number(m[2]);
  return { prefix, number, ref: `${prefix}-${number}` };
}

/** TicketFly references: TF-000123 (zero-padded for sortable display). */
export function formatTicketRef(id: number): string {
  return `TF-${String(id).padStart(6, "0")}`;
}

/** Subject tag used for email threading. Recognises both new and legacy forms. */
const SUBJECT_TAG_RE = /\[#(TF-\d{1,8}|INC-\d{1,8}|SR-\d{1,8}|CHG-\d{1,8})\]/i;

export function parseSubjectTag(subject: string): string | null {
  const m = SUBJECT_TAG_RE.exec(subject);
  return m ? (m[1] as string).toUpperCase() : null;
}
