"use server";

import { db, schema } from "@ticketfly/db";
import { and, eq, or, sql } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requirePrincipal, requireStaff } from "@/lib/auth";
import { logActivity } from "@/lib/activity";
import { alertPriority } from "@ticketfly/core";

const s = (fd: FormData, k: string) => {
  const v = fd.get(k);
  return v === null ? "" : String(v).trim();
};
const n = (fd: FormData, k: string) => (s(fd, k) ? Number(s(fd, k)) : null);
const d = (fd: FormData, k: string) => (s(fd, k) ? new Date(s(fd, k)) : null);

// ---------- Problems ----------
export async function createProblem(fd: FormData) {
  const me = await requireStaff();
  const [p] = await db
    .insert(schema.problems)
    .values({ title: s(fd, "title"), description: s(fd, "description"), priority: (s(fd, "priority") || "medium") as never, impact: (s(fd, "impact") || "medium") as never, groupId: n(fd, "groupId"), categoryId: n(fd, "categoryId"), assigneeId: n(fd, "assigneeId") ?? me.id, workaround: s(fd, "workaround") || null })
    .returning({ id: schema.problems.id });
  const linkIds = fd.getAll("ticketIds").map(Number).filter(Boolean);
  if (linkIds.length) {
    await db.insert(schema.problemIncidents).values(linkIds.map((ticketId) => ({ problemId: p!.id, ticketId })));
    for (const id of linkIds) await db.update(schema.tickets).set({ problemId: p!.id }).where(eq(schema.tickets.id, id));
  }
  await logActivity(me, { action: "problem.create", category: "workflow", targetType: "problem", targetId: p!.id, after: { linked: linkIds.length } });
  redirect(`/problems/${p!.id}`);
}

export async function updateProblem(id: number, fd: FormData) {
  const me = await requireStaff();
  const [cur] = await db.select().from(schema.problems).where(eq(schema.problems.id, id)).limit(1);
  if (!cur) return;
  const patch: Partial<typeof schema.problems.$inferInsert> = { updatedAt: new Date() };
  const before: Record<string, unknown> = {};
  const after: Record<string, unknown> = {};
  for (const k of ["status", "priority", "impact", "rootCause", "workaround", "permanentFix"] as const) {
    if (!fd.has(k)) continue;
    const v = s(fd, k) || null;
    if (v !== cur[k]) {
      before[k] = cur[k];
      after[k] = v;
      (patch as Record<string, unknown>)[k] = v;
    }
  }
  if (fd.has("assigneeId") && n(fd, "assigneeId") !== cur.assigneeId) {
    before.assigneeId = cur.assigneeId;
    after.assigneeId = n(fd, "assigneeId");
    patch.assigneeId = n(fd, "assigneeId");
  }
  if (after.status === "resolved" || after.status === "closed") patch.resolvedAt = new Date();
  if (!Object.keys(after).length) return;
  await db.update(schema.problems).set(patch).where(eq(schema.problems.id, id));
  await logActivity(me, { action: after.status ? "problem.status.update" : "problem.update", category: "workflow", targetType: "problem", targetId: id, before, after });
  revalidatePath(`/problems/${id}`);
  revalidatePath("/problems");
}

export async function linkIncident(problemId: number, ticketId: number) {
  const me = await requireStaff();
  await db.insert(schema.problemIncidents).values({ problemId, ticketId }).onConflictDoNothing();
  await db.update(schema.tickets).set({ problemId }).where(eq(schema.tickets.id, ticketId));
  await db.insert(schema.ticketMessages).values({ ticketId, authorId: me.id, kind: "system", body: `linked to problem PRB-${problemId}`, via: "agent" });
  await logActivity(me, { action: "problem.incident.link", category: "workflow", targetType: "problem", targetId: problemId, after: { ticketId } });
  revalidatePath(`/problems/${problemId}`);
}

export async function raiseChangeFromProblem(problemId: number) {
  const me = await requireStaff();
  const [p] = await db.select().from(schema.problems).where(eq(schema.problems.id, problemId)).limit(1);
  if (!p) return;
  const [c] = await db.insert(schema.changes).values({ title: `Fix: ${p.title}`, description: p.permanentFix ?? p.description, reason: `Permanent fix for problem PRB-${p.id}`, type: "normal", status: "planning", risk: p.impact, impact: p.impact, priority: p.priority, requesterId: me.id, assigneeId: p.assigneeId, groupId: p.groupId }).returning({ id: schema.changes.id });
  await db.update(schema.problems).set({ changeId: c!.id, updatedAt: new Date() }).where(eq(schema.problems.id, problemId));
  await logActivity(me, { action: "change.create", category: "workflow", targetType: "change", targetId: c!.id, after: { fromProblem: problemId } });
  redirect(`/changes/${c!.id}`);
}

// ---------- Changes ----------
export async function createChange(fd: FormData) {
  const me = await requireStaff();
  const type = (s(fd, "type") || "normal") as "standard" | "normal" | "emergency";
  const approvers = fd.getAll("approverIds").map(Number).filter(Boolean);
  const names = approvers.length ? await db.select({ id: schema.people.id, displayName: schema.people.displayName }).from(schema.people).where(sql`id = any(${approvers})`) : [];
  const [c] = await db
    .insert(schema.changes)
    .values({
      title: s(fd, "title"),
      description: s(fd, "description"),
      reason: s(fd, "reason") || null,
      type,
      status: type === "standard" ? "approved" : approvers.length ? "awaiting_approval" : "planning",
      risk: (s(fd, "risk") || "medium") as never,
      impact: (s(fd, "impact") || "medium") as never,
      priority: (s(fd, "priority") || "medium") as never,
      requesterId: me.id,
      assigneeId: n(fd, "assigneeId") ?? me.id,
      groupId: n(fd, "groupId"),
      plannedStart: d(fd, "plannedStart"),
      plannedEnd: d(fd, "plannedEnd"),
      rollbackPlan: s(fd, "rollbackPlan") || null,
      testPlan: s(fd, "testPlan") || null,
      approvals: names.map((p) => ({ personId: p.id, name: p.displayName, decision: "pending" as const })),
      releaseId: n(fd, "releaseId"),
    })
    .returning({ id: schema.changes.id });
  if (names.length) await db.insert(schema.notifications).values(names.map((p) => ({ personId: p.id, kind: "approval", title: "Approval requested", body: s(fd, "title"), href: `/changes/${c!.id}` })));
  await logActivity(me, { action: "change.create", category: "workflow", targetType: "change", targetId: c!.id, after: { type, approvers: names.length } });
  redirect(`/changes/${c!.id}`);
}

const TRANSITIONS: Record<string, string[]> = {
  open: ["planning"],
  planning: ["awaiting_approval", "approved"],
  awaiting_approval: ["approved", "planning"],
  approved: ["in_progress"],
  in_progress: ["completed", "rolled_back"],
  completed: ["closed"],
  rolled_back: ["closed", "planning"],
  closed: [],
};

export async function transitionChange(id: number, to: string) {
  const me = await requireStaff();
  const [c] = await db.select().from(schema.changes).where(eq(schema.changes.id, id)).limit(1);
  if (!c || !TRANSITIONS[c.status]?.includes(to)) return;
  if (to === "approved" && c.approvals.some((a) => a.decision !== "approved") && c.type !== "standard") return;
  const patch: Partial<typeof schema.changes.$inferInsert> = { status: to as never, updatedAt: new Date() };
  if (to === "completed" || to === "rolled_back") patch.completedAt = new Date();
  await db.update(schema.changes).set(patch).where(eq(schema.changes.id, id));
  await logActivity(me, { action: "change.status.update", category: "workflow", targetType: "change", targetId: id, before: { status: c.status }, after: { status: to } });
  if (to === "in_progress") {
    // Enhancement: starting a change flips linked services into maintenance on the status page.
    await db.insert(schema.notifications).values({ personId: c.requesterId, kind: "change", title: "Change started", body: c.title, href: `/changes/${id}` });
  }
  revalidatePath(`/changes/${id}`);
  revalidatePath("/changes");
}

export async function decideApproval(id: number, decision: "approved" | "rejected", note?: string) {
  const me = await requireStaff();
  const [c] = await db.select().from(schema.changes).where(eq(schema.changes.id, id)).limit(1);
  if (!c) return;
  const approvals = c.approvals.map((a) => (a.personId === me.id ? { ...a, decision, at: new Date().toISOString(), note } : a));
  if (!approvals.some((a) => a.personId === me.id)) return;
  const allApproved = approvals.every((a) => a.decision === "approved");
  const anyRejected = approvals.some((a) => a.decision === "rejected");
  await db.update(schema.changes).set({ approvals, status: allApproved ? "approved" : anyRejected ? "planning" : c.status, updatedAt: new Date() }).where(eq(schema.changes.id, id));
  await db.insert(schema.notifications).values({ personId: c.requesterId, kind: "approval", title: `Change ${decision}`, body: `${me.displayName} ${decision} "${c.title}"`, href: `/changes/${id}` });
  await logActivity(me, { action: `change.approval.${decision}`, category: "workflow", targetType: "change", targetId: id, after: { decision, note } });
  revalidatePath(`/changes/${id}`);
  revalidatePath("/changes");
  revalidatePath("/notifications");
}

// ---------- Tasks ----------
export async function createTask(fd: FormData) {
  const me = await requireStaff();
  const parentType = s(fd, "parentType");
  const parentId = Number(s(fd, "parentId"));
  const [t] = await db.insert(schema.tasks).values({ title: s(fd, "title"), parentType, parentId, assigneeId: n(fd, "assigneeId") ?? me.id, dueAt: d(fd, "dueAt") }).returning({ id: schema.tasks.id });
  await logActivity(me, { action: "task.create", category: "workflow", targetType: parentType, targetId: parentId, after: { taskId: t!.id } });
  revalidatePath(s(fd, "back") || "/tasks");
}

export async function toggleTask(id: number, back?: string) {
  const me = await requireStaff();
  const [t] = await db.select().from(schema.tasks).where(eq(schema.tasks.id, id)).limit(1);
  if (!t) return;
  const done = t.status !== "done";
  await db.update(schema.tasks).set({ status: done ? "done" : "open", completedAt: done ? new Date() : null }).where(eq(schema.tasks.id, id));
  await logActivity(me, { action: done ? "task.complete" : "task.reopen", category: "workflow", targetType: t.parentType, targetId: t.parentId, after: { taskId: id } });
  revalidatePath("/tasks");
  if (back) revalidatePath(back);
}

// ---------- IT Ops ----------
export async function ackAlert(id: number) {
  const me = await requireStaff();
  await db.update(schema.alerts).set({ status: "acknowledged", acknowledgedAt: new Date() }).where(and(eq(schema.alerts.id, id), eq(schema.alerts.status, "new")));
  await logActivity(me, { action: "alert.acknowledge", category: "integration", targetType: "alert", targetId: id });
  revalidatePath("/it-ops/alerts");
}
export async function resolveAlert(id: number) {
  const me = await requireStaff();
  await db.update(schema.alerts).set({ status: "resolved", resolvedAt: new Date() }).where(eq(schema.alerts.id, id));
  await logActivity(me, { action: "alert.resolve", category: "integration", targetType: "alert", targetId: id });
  revalidatePath("/it-ops/alerts");
}
export async function alertToIncident(id: number) {
  const me = await requireStaff();
  const [a] = await db.select().from(schema.alerts).where(eq(schema.alerts.id, id)).limit(1);
  if (!a || a.ticketId) return;
  const [t] = await db.insert(schema.tickets).values({ kind: "incident", subject: a.title, description: `${a.detail ?? ""}\n\nSource: ${a.source} · Resource: ${a.resource ?? "—"} · Fired ${a.firedAt.toISOString()}`, status: "open", priority: alertPriority(a.severity, a.source), requesterId: me.id, assigneeId: me.id, source: "system", tags: ["alert", a.source] }).returning({ id: schema.tickets.id });
  await db.update(schema.alerts).set({ ticketId: t!.id, status: a.status === "new" ? "acknowledged" : a.status, acknowledgedAt: a.acknowledgedAt ?? new Date() }).where(eq(schema.alerts.id, id));
  await logActivity(me, { action: "alert.incident.create", category: "integration", targetType: "alert", targetId: id, after: { ticketId: t!.id } });
  redirect(`/tickets/${t!.id}`);
}
export async function setServiceHealth(id: number, health: string) {
  const me = await requireStaff();
  await db.update(schema.itServices).set({ health }).where(eq(schema.itServices.id, id));
  await logActivity(me, { action: "service.health.update", category: "system", targetType: "service", targetId: id, after: { health } });
  revalidatePath("/it-ops/status");
}

// ---------- Projects ----------
export async function createProject(fd: FormData) {
  const me = await requireStaff();
  const [p] = await db.insert(schema.projects).values({ name: s(fd, "name"), description: s(fd, "description") || null, ownerId: me.id, startDate: s(fd, "startDate") || null, endDate: s(fd, "endDate") || null, status: "planning" }).returning({ id: schema.projects.id });
  await db.insert(schema.projectRows).values([0, 1, 2].map((i) => ({ projectId: p!.id, position: i, title: "" })));
  await logActivity(me, { action: "project.create", category: "workflow", targetType: "project", targetId: p!.id });
  redirect(`/projects/${p!.id}`);
}

export async function updateProjectRow(rowId: number, patch: { title?: string; status?: string; ownerId?: number | null; startDate?: string | null; endDate?: string | null; percent?: number; priority?: string; notes?: string | null }) {
  const me = await requireStaff();
  const [cur] = await db.select().from(schema.projectRows).where(eq(schema.projectRows.id, rowId)).limit(1);
  if (!cur) return;
  const clean: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(patch)) if (v !== undefined && v !== (cur as Record<string, unknown>)[k]) clean[k] = v;
  if (clean.status === "done") clean.percent = 100;
  if (typeof clean.percent === "number" && clean.percent >= 100 && !clean.status) clean.status = "done";
  if (!Object.keys(clean).length) return;
  await db.update(schema.projectRows).set({ ...clean, updatedAt: new Date() }).where(eq(schema.projectRows.id, rowId));
  await logActivity(me, { action: "project.row.update", category: "workflow", targetType: "project", targetId: cur.projectId, before: Object.fromEntries(Object.keys(clean).map((k) => [k, (cur as Record<string, unknown>)[k]])), after: clean });
  revalidatePath(`/projects/${cur.projectId}`);
}

export async function addProjectRow(projectId: number, afterRowId?: number) {
  await requireStaff();
  const rows = await db.select({ id: schema.projectRows.id, position: schema.projectRows.position, parentId: schema.projectRows.parentId }).from(schema.projectRows).where(eq(schema.projectRows.projectId, projectId)).orderBy(schema.projectRows.position);
  const after = rows.find((r) => r.id === afterRowId);
  const pos = after ? after.position + 1 : rows.length;
  if (after) await db.execute(sql`update project_rows set position = position + 1 where project_id = ${projectId} and position >= ${pos}`);
  await db.insert(schema.projectRows).values({ projectId, position: pos, parentId: after?.parentId ?? null, title: "" });
  revalidatePath(`/projects/${projectId}`);
}

export async function deleteProjectRow(rowId: number) {
  const me = await requireStaff();
  const [cur] = await db.select().from(schema.projectRows).where(eq(schema.projectRows.id, rowId)).limit(1);
  if (!cur) return;
  await db.delete(schema.projectRows).where(or(eq(schema.projectRows.id, rowId), eq(schema.projectRows.parentId, rowId)));
  await logActivity(me, { action: "project.row.delete", category: "workflow", targetType: "project", targetId: cur.projectId, before: { title: cur.title } });
  revalidatePath(`/projects/${cur.projectId}`);
}

export async function indentProjectRow(rowId: number, direction: "in" | "out") {
  await requireStaff();
  const [cur] = await db.select().from(schema.projectRows).where(eq(schema.projectRows.id, rowId)).limit(1);
  if (!cur) return;
  if (direction === "out") {
    await db.update(schema.projectRows).set({ parentId: null }).where(eq(schema.projectRows.id, rowId));
  } else {
    const [prev] = await db.select().from(schema.projectRows).where(and(eq(schema.projectRows.projectId, cur.projectId), sql`${schema.projectRows.position} < ${cur.position}`, sql`${schema.projectRows.parentId} is null`)).orderBy(sql`${schema.projectRows.position} desc`).limit(1);
    if (prev && prev.id !== rowId) await db.update(schema.projectRows).set({ parentId: prev.id }).where(eq(schema.projectRows.id, rowId));
  }
  revalidatePath(`/projects/${cur.projectId}`);
}

// ---------- Notifications & prefs ----------
export async function markAllRead() {
  const me = await requirePrincipal();
  await db.update(schema.notifications).set({ readAt: new Date() }).where(and(eq(schema.notifications.personId, me.id), sql`${schema.notifications.readAt} is null`));
  revalidatePath("/notifications");
}
export async function markRead(id: number) {
  const me = await requirePrincipal();
  await db.update(schema.notifications).set({ readAt: new Date() }).where(and(eq(schema.notifications.id, id), eq(schema.notifications.personId, me.id)));
  revalidatePath("/notifications");
}
export async function saveSidebarPrefs(fd: FormData) {
  const me = await requirePrincipal();
  const hidden = fd.getAll("hidden").map(String);
  await db.insert(schema.userPrefs).values({ personId: me.id, hiddenModules: hidden }).onConflictDoUpdate({ target: schema.userPrefs.personId, set: { hiddenModules: hidden, updatedAt: new Date() } });
  await logActivity(me, { action: "prefs.sidebar.update", category: "settings", targetType: "person", targetId: me.id, after: { hidden } });
  revalidatePath("/", "layout");
}

// ---------- Assets & KB creation ----------
export async function createAsset(fd: FormData) {
  const me = await requireStaff();
  const type = (s(fd, "type") || "laptop") as never;
  const prefix = { laptop: "LT", desktop: "DT", mobile: "MB", tablet: "TB", monitor: "MN", peripheral: "PR", server: "SV" }[s(fd, "type") || "laptop"] ?? "AS";
  const [mx] = (await db.execute(sql`select coalesce(max(substring(asset_tag from '[0-9]+$')::int), 100) as max from assets`)) as unknown as { max: number }[];
  const max = mx?.max ?? 100;
  const ownerId = n(fd, "ownerId");
  const [a] = await db
    .insert(schema.assets)
    .values({ assetTag: `QI-${prefix}-${String(Number(max) + 1).padStart(4, "0")}`, name: s(fd, "name") || s(fd, "model"), type, model: s(fd, "model") || null, serial: s(fd, "serial") || null, vendor: s(fd, "vendor") || null, ownerId, status: ownerId ? "in_use" : "in_stock", compliance: "unknown", source: "manual", lastSeenCity: s(fd, "location") || null, department: s(fd, "department") || null, purchaseDate: s(fd, "purchaseDate") || null, cost: s(fd, "cost") || null, impact: s(fd, "impact") || "low", assignedOn: ownerId ? new Date() : null, managedById: me.id })
    .returning({ id: schema.assets.id });
  if (ownerId) await db.insert(schema.assetAssignments).values({ assetId: a!.id, personId: ownerId, note: `Added manually by ${me.displayName}` });
  await logActivity(me, { action: "asset.create", category: "asset", targetType: "asset", targetId: a!.id, after: { type, ownerId } });
  redirect(`/assets/${a!.id}`);
}

export async function createArticle(fd: FormData) {
  const me = await requireStaff();
  const [a] = await db.insert(schema.kbArticles).values({ folderId: Number(s(fd, "folderId")), title: s(fd, "title"), body: s(fd, "body"), status: s(fd, "status") || "draft", authorId: me.id, reviewDue: s(fd, "reviewDue") || null }).returning({ id: schema.kbArticles.id });
  await logActivity(me, { action: "kb.article.create", category: "workflow", targetType: "article", targetId: a!.id });
  redirect(`/solutions/${a!.id}`);
}
