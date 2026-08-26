/** Automation rules as pure functions — the Admin page lists them, the worker runs them, these tests prove them. */

const DAY = 86_400_000;

/** Closure rule: resolved tickets with no requester reply for `days` business days auto-close. */
export function shouldAutoClose(resolvedAt: Date | null, lastRequesterReplyAt: Date | null, now: Date, days = 3): boolean {
  if (!resolvedAt) return false;
  if (lastRequesterReplyAt && lastRequesterReplyAt > resolvedAt) return false;
  return now.getTime() - resolvedAt.getTime() >= days * DAY;
}

/** Assignment policy: least-loaded agent in the group; ties broken by round-robin order. */
export function pickAssignee<T extends { id: number; open: number }>(agents: T[], lastPickedId?: number | null): T | null {
  if (!agents.length) return null;
  const min = Math.min(...agents.map((a) => a.open));
  const candidates = agents.filter((a) => a.open === min);
  if (candidates.length === 1 || lastPickedId == null) return candidates[0]!;
  const idx = candidates.findIndex((a) => a.id === lastPickedId);
  return candidates[(idx + 1) % candidates.length]!;
}

/** Supervisor rule: tickets waiting on the requester for more than `days` get a reminder, and close after `closeAfter`. */
export function pendingAction(pausedSince: Date | null, now: Date, remindAfterDays = 2, closeAfterDays = 7): "none" | "remind" | "close" {
  if (!pausedSince) return "none";
  const d = (now.getTime() - pausedSince.getTime()) / DAY;
  if (d >= closeAfterDays) return "close";
  if (d >= remindAfterDays) return "remind";
  return "none";
}

/** Alert → incident mapping: severity and source decide priority; the key de-duplicates repeats within a window. */
export function alertPriority(severity: string, source: string): "low" | "medium" | "high" | "urgent" {
  if (severity === "high") return source === "defender" ? "urgent" : "high";
  if (severity === "medium") return "high";
  return "medium";
}
export function alertKey(a: { source: string; title: string; resource?: string | null }): string {
  return `${a.source}::${(a.resource ?? "").toLowerCase()}::${a.title.toLowerCase().replace(/\d+/g, "#")}`;
}
export function isDuplicateAlert(existing: { key: string; firedAt: Date }[], candidate: { key: string; firedAt: Date }, windowHours = 24): boolean {
  return existing.some((e) => e.key === candidate.key && Math.abs(candidate.firedAt.getTime() - e.firedAt.getTime()) < windowHours * 3_600_000);
}
