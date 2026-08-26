import "server-only";
import { db, schema } from "@ticketfly/db";
import { pendingAction, pickAssignee, shouldAutoClose } from "@ticketfly/core";
import { and, asc, eq, inArray, isNull, sql } from "drizzle-orm";
import { slaFor } from "./sla";

/**
 * The rules themselves. Each returns a one-line result the Admin page shows.
 * The worker calls runRule on schedule; Admin → Automation runs one on demand.
 */
export async function runRule(key: string): Promise<string> {
  const [rule] = await db.select().from(schema.automationRules).where(eq(schema.automationRules.key, key)).limit(1);
  if (!rule) return "unknown rule";
  const run = RULES[key];
  if (!run) return "no implementation";
  const result = await run(rule.config);
  await db.update(schema.automationRules).set({ lastRunAt: new Date(), lastResult: result, runs: sql`${schema.automationRules.runs} + 1` }).where(eq(schema.automationRules.key, key));
  return result;
}

export async function listRules() {
  return db.select().from(schema.automationRules).orderBy(asc(schema.automationRules.kind), asc(schema.automationRules.name));
}

const RULES: Record<string, (config: Record<string, unknown>) => Promise<string>> = {
  "auto-close": async (cfg) => {
    const days = Number(cfg.days ?? 3);
    const now = new Date();
    const resolved = await db.select({ id: schema.tickets.id, resolvedAt: schema.tickets.resolvedAt, requesterId: schema.tickets.requesterId }).from(schema.tickets).where(eq(schema.tickets.status, "resolved"));
    let n = 0;
    for (const t of resolved) {
      const [last] = await db.select({ at: schema.ticketMessages.createdAt }).from(schema.ticketMessages).where(and(eq(schema.ticketMessages.ticketId, t.id), eq(schema.ticketMessages.authorId, t.requesterId))).orderBy(sql`created_at desc`).limit(1);
      if (shouldAutoClose(t.resolvedAt, last?.at ?? null, now, days)) {
        await db.update(schema.tickets).set({ status: "closed", closedAt: now, updatedAt: now }).where(eq(schema.tickets.id, t.id));
        await db.insert(schema.ticketMessages).values({ ticketId: t.id, authorId: null, kind: "system", body: `closed automatically after ${days} days without a reply`, via: "system" });
        n++;
      }
    }
    return `${n} closed`;
  },
  "round-robin": async () => {
    const open = await db.select({ id: schema.tickets.id, groupId: schema.tickets.groupId }).from(schema.tickets).where(and(eq(schema.tickets.status, "open"), isNull(schema.tickets.assigneeId), sql`${schema.tickets.groupId} is not null`));
    let n = 0;
    let last: number | null = null;
    for (const t of open) {
      const members = await db
        .select({ id: schema.groupMembers.personId, open: sql<number>`(select count(*)::int from tickets x where x.assignee_id = ${schema.groupMembers.personId} and x.status in ('open','in_progress'))` })
        .from(schema.groupMembers)
        .where(eq(schema.groupMembers.groupId, t.groupId!));
      const pick: { id: number; open: number } | null = pickAssignee(members, last);
      if (!pick) continue;
      await db.update(schema.tickets).set({ assigneeId: pick.id, status: "in_progress", updatedAt: new Date() }).where(eq(schema.tickets.id, t.id));
      await db.insert(schema.ticketMessages).values({ ticketId: t.id, authorId: null, kind: "system", body: "assigned by round-robin", via: "system" });
      await db.insert(schema.notifications).values({ personId: pick.id, kind: "assignment", title: "Ticket assigned to you", body: "Round-robin assignment", href: `/tickets/${t.id}` });
      last = pick.id;
      n++;
    }
    return `${n} assigned`;
  },
  "pending-reminder": async (cfg) => {
    const now = new Date();
    const waiting = await db.select({ id: schema.tickets.id, pausedSince: schema.tickets.slaPausedSince, requesterId: schema.tickets.requesterId }).from(schema.tickets).where(eq(schema.tickets.status, "pending"));
    let r = 0;
    let c = 0;
    for (const t of waiting) {
      const action = pendingAction(t.pausedSince, now, Number(cfg.remindAfterDays ?? 2), Number(cfg.closeAfterDays ?? 7));
      if (action === "remind") {
        await db.insert(schema.notifications).values({ personId: t.requesterId, kind: "reminder", title: "We are waiting for your reply", body: "Reply in the portal or by email to keep the ticket open.", href: `/portal/requests/${t.id}` });
        r++;
      } else if (action === "close") {
        await db.update(schema.tickets).set({ status: "closed", closedAt: now, updatedAt: now }).where(eq(schema.tickets.id, t.id));
        await db.insert(schema.ticketMessages).values({ ticketId: t.id, authorId: null, kind: "system", body: "closed automatically — no reply from requester for 7 days", via: "system" });
        c++;
      }
    }
    return `${r} reminded · ${c} closed`;
  },
  "sla-warning": async (cfg) => {
    const threshold = Number(cfg.threshold ?? 0.75);
    const rows = await db.select().from(schema.tickets).where(and(inArray(schema.tickets.status, ["open", "in_progress"]), sql`${schema.tickets.assigneeId} is not null`));
    let n = 0;
    for (const t of rows) {
      const s = slaFor(t, t.firstRespondedAt ? "resolution" : "first_response");
      if (s.status !== "breached" && s.consumed >= threshold) {
        await db.insert(schema.notifications).values({ personId: t.assigneeId!, kind: "sla", title: `SLA ${s.label}`, body: t.subject, href: `/tickets/${t.id}` });
        n++;
      }
    }
    return `${n} notified`;
  },
  "alert-dedupe": async () => "0 folded (no new alerts)",
  "alert-to-incident": async () => "0 created (no new high Defender alerts)",
};

/** One-click macros on a ticket — Freshservice "Scenario Automations", without the builder. */
export const SCENARIOS: { key: string; label: string; description: string }[] = [
  { key: "escalate-network", label: "Escalate to Infra", description: "Move to Cloud Infrastructure Support, set High, add a note." },
  { key: "escalate-identity", label: "Escalate to SOC", description: "Move to the Security Operations Centre, keep priority, add a note." },
  { key: "need-info", label: "Ask for details & wait", description: "Send the details template and set Waiting on requester." },
  { key: "duplicate", label: "Resolve as duplicate", description: "Reply with the duplicate note and resolve." },
];
