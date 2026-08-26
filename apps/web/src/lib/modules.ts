import "server-only";
import { db, schema } from "@ticketfly/db";
import { and, asc, count, desc, eq, gte, inArray, isNull, lte, sql } from "drizzle-orm";

const personName = (col: unknown) => sql<string | null>`(select display_name from people p where p.id = ${col})`;

// ---------- Problems ----------
export async function listProblems(status?: string) {
  const p = schema.problems;
  return db
    .select({
      p,
      assignee: personName(p.assigneeId),
      group: schema.groups.name,
      category: schema.categories.name,
      incidents: sql<number>`(select count(*)::int from problem_incidents x where x.problem_id = ${p.id})`,
      openTasks: sql<number>`(select count(*)::int from tasks t where t.parent_type = 'problem' and t.parent_id = ${p.id} and t.status <> 'done')`,
    })
    .from(p)
    .leftJoin(schema.groups, eq(schema.groups.id, p.groupId))
    .leftJoin(schema.categories, eq(schema.categories.id, p.categoryId))
    .where(status ? eq(p.status, status as never) : undefined)
    .orderBy(sql`case ${p.status} when 'open' then 0 when 'known_error' then 1 when 'resolved' then 2 else 3 end`, desc(p.updatedAt));
}

export async function getProblem(id: number) {
  const p = schema.problems;
  const [row] = await db.select({ p, assignee: personName(p.assigneeId), group: schema.groups.name, category: schema.categories.name }).from(p).leftJoin(schema.groups, eq(schema.groups.id, p.groupId)).leftJoin(schema.categories, eq(schema.categories.id, p.categoryId)).where(eq(p.id, id)).limit(1);
  if (!row) return null;
  const incidents = await db
    .select({ id: schema.tickets.id, subject: schema.tickets.subject, status: schema.tickets.status, priority: schema.tickets.priority, createdAt: schema.tickets.createdAt, requester: schema.people.displayName, legacyRef: schema.tickets.legacyRef })
    .from(schema.problemIncidents)
    .innerJoin(schema.tickets, eq(schema.tickets.id, schema.problemIncidents.ticketId))
    .leftJoin(schema.people, eq(schema.people.id, schema.tickets.requesterId))
    .where(eq(schema.problemIncidents.problemId, id))
    .orderBy(desc(schema.tickets.createdAt));
  const tasks = await listTasksFor("problem", id);
  const change = row.p.changeId ? (await db.select({ id: schema.changes.id, title: schema.changes.title, status: schema.changes.status }).from(schema.changes).where(eq(schema.changes.id, row.p.changeId)).limit(1))[0] ?? null : null;
  // Candidates to link: open tickets in the same category not already linked
  const candidates = row.p.categoryId
    ? await db
        .select({ id: schema.tickets.id, subject: schema.tickets.subject, status: schema.tickets.status })
        .from(schema.tickets)
        .where(and(eq(schema.tickets.categoryId, row.p.categoryId), inArray(schema.tickets.status, ["open", "in_progress", "pending"]), isNull(schema.tickets.problemId)))
        .limit(8)
    : [];
  const activity = await db.select().from(schema.activityLog).where(and(eq(schema.activityLog.targetType, "problem"), eq(schema.activityLog.targetId, String(id)))).orderBy(desc(schema.activityLog.ts)).limit(20);
  return { ...row, incidents, tasks, change, candidates, activity };
}

// ---------- Changes ----------
export async function listChanges(filter?: string) {
  const c = schema.changes;
  const conds = [];
  if (filter === "approval") conds.push(eq(c.status, "awaiting_approval"));
  else if (filter === "scheduled") conds.push(inArray(c.status, ["approved", "in_progress"]));
  else if (filter === "closed") conds.push(inArray(c.status, ["completed", "rolled_back", "closed"]));
  else if (filter === "open") conds.push(inArray(c.status, ["open", "planning", "awaiting_approval", "approved", "in_progress"]));
  return db
    .select({ c, requester: personName(c.requesterId), assignee: personName(c.assigneeId), group: schema.groups.name, release: schema.itReleases.name, openTasks: sql<number>`(select count(*)::int from tasks t where t.parent_type = 'change' and t.parent_id = ${c.id} and t.status <> 'done')` })
    .from(c)
    .leftJoin(schema.groups, eq(schema.groups.id, c.groupId))
    .leftJoin(schema.itReleases, eq(schema.itReleases.id, c.releaseId))
    .where(conds.length ? and(...conds) : undefined)
    .orderBy(sql`case ${c.status} when 'awaiting_approval' then 0 when 'in_progress' then 1 when 'approved' then 2 when 'planning' then 3 when 'open' then 4 else 5 end`, asc(c.plannedStart));
}

export async function changeCounts() {
  const c = schema.changes;
  const [r] = await db.select({ approval: sql<number>`count(*) filter (where ${c.status} = 'awaiting_approval')::int`, scheduled: sql<number>`count(*) filter (where ${c.status} in ('approved','in_progress'))::int`, open: sql<number>`count(*) filter (where ${c.status} in ('open','planning','awaiting_approval','approved','in_progress'))::int`, thisWeek: sql<number>`count(*) filter (where ${c.plannedStart} between now() and now() + interval '7 days')::int` }).from(c);
  return r!;
}

export async function getChange(id: number) {
  const c = schema.changes;
  const [row] = await db.select({ c, requester: personName(c.requesterId), assignee: personName(c.assigneeId), group: schema.groups.name, release: schema.itReleases.name }).from(c).leftJoin(schema.groups, eq(schema.groups.id, c.groupId)).leftJoin(schema.itReleases, eq(schema.itReleases.id, c.releaseId)).where(eq(c.id, id)).limit(1);
  if (!row) return null;
  const tasks = await listTasksFor("change", id);
  const problems = await db.select({ id: schema.problems.id, title: schema.problems.title, status: schema.problems.status }).from(schema.problems).where(eq(schema.problems.changeId, id));
  const assets = row.c.affectedAssetIds.length ? await db.select({ id: schema.assets.id, name: schema.assets.name, assetTag: schema.assets.assetTag }).from(schema.assets).where(inArray(schema.assets.id, row.c.affectedAssetIds)) : [];
  const activity = await db.select().from(schema.activityLog).where(and(eq(schema.activityLog.targetType, "change"), eq(schema.activityLog.targetId, String(id)))).orderBy(desc(schema.activityLog.ts)).limit(20);
  const services = await db.select().from(schema.itServices).orderBy(asc(schema.itServices.id));
  return { ...row, tasks, problems, assets, activity, services };
}

export async function changeCalendar(from: Date, to: Date) {
  const c = schema.changes;
  return db.select({ id: c.id, title: c.title, type: c.type, status: c.status, risk: c.risk, plannedStart: c.plannedStart, plannedEnd: c.plannedEnd }).from(c).where(and(gte(c.plannedStart, from), lte(c.plannedStart, to))).orderBy(asc(c.plannedStart));
}

// ---------- Releases ----------
export async function listReleasesIt() {
  const r = schema.itReleases;
  return db.select({ r, owner: personName(r.ownerId), changes: sql<number>`(select count(*)::int from changes c where c.release_id = ${r.id})`, done: sql<number>`(select count(*)::int from changes c where c.release_id = ${r.id} and c.status in ('completed','closed'))` }).from(r).orderBy(asc(r.plannedStart));
}
export async function getReleaseIt(id: number) {
  const r = schema.itReleases;
  const [row] = await db.select({ r, owner: personName(r.ownerId) }).from(r).where(eq(r.id, id)).limit(1);
  if (!row) return null;
  const changes = await db.select({ id: schema.changes.id, title: schema.changes.title, status: schema.changes.status, type: schema.changes.type, risk: schema.changes.risk, plannedStart: schema.changes.plannedStart, assignee: personName(schema.changes.assigneeId) }).from(schema.changes).where(eq(schema.changes.releaseId, id)).orderBy(asc(schema.changes.plannedStart));
  return { ...row, changes };
}

// ---------- Tasks ----------
export async function listTasksFor(parentType: string, parentId: number) {
  const t = schema.tasks;
  return db.select({ t, assignee: personName(t.assigneeId) }).from(t).where(and(eq(t.parentType, parentType), eq(t.parentId, parentId))).orderBy(sql`case ${t.status} when 'done' then 1 else 0 end`, asc(t.dueAt));
}

export async function listTasks(opts: { meId: number; scope: "mine" | "all" | "overdue" | "done" }) {
  const t = schema.tasks;
  const conds = [];
  if (opts.scope === "mine") conds.push(eq(t.assigneeId, opts.meId), sql`${t.status} <> 'done'`);
  if (opts.scope === "all") conds.push(sql`${t.status} <> 'done'`);
  if (opts.scope === "overdue") conds.push(sql`${t.status} <> 'done'`, sql`${t.dueAt} < now()`);
  if (opts.scope === "done") conds.push(eq(t.status, "done"));
  const rows = await db
    .select({
      t,
      assignee: personName(t.assigneeId),
      parentTitle: sql<string | null>`case ${t.parentType} when 'ticket' then (select subject from tickets x where x.id = ${t.parentId}) when 'change' then (select title from changes x where x.id = ${t.parentId}) when 'problem' then (select title from problems x where x.id = ${t.parentId}) when 'journey' then (select display_name from people p join onboardings o on o.person_id = p.id where o.id = ${t.parentId}) else null end`,
    })
    .from(t)
    .where(conds.length ? and(...conds) : undefined)
    .orderBy(asc(t.dueAt))
    .limit(200);
  const [k] = await db.select({ mine: sql<number>`count(*) filter (where ${t.assigneeId} = ${opts.meId} and ${t.status} <> 'done')::int`, all: sql<number>`count(*) filter (where ${t.status} <> 'done')::int`, overdue: sql<number>`count(*) filter (where ${t.status} <> 'done' and ${t.dueAt} < now())::int`, dueToday: sql<number>`count(*) filter (where ${t.assigneeId} = ${opts.meId} and ${t.status} <> 'done' and ${t.dueAt}::date <= now()::date)::int` }).from(t);
  return { rows, k: k! };
}

export function taskHref(parentType: string, parentId: number) {
  return parentType === "ticket" ? `/tickets/${parentId}` : parentType === "change" ? `/changes/${parentId}` : parentType === "problem" ? `/problems/${parentId}` : parentType === "journey" ? `/journeys/onboarding` : parentType === "project" ? `/projects/${parentId}` : "/tasks";
}

// ---------- IT Ops ----------
export async function listAlerts(status?: string) {
  const a = schema.alerts;
  const rows = await db.select({ a, ticketSubject: sql<string | null>`(select subject from tickets t where t.id = ${a.ticketId})` }).from(a).where(status ? eq(a.status, status) : undefined).orderBy(sql`case ${a.status} when 'new' then 0 when 'acknowledged' then 1 else 2 end`, desc(a.firedAt));
  const [k] = await db.select({ newCount: sql<number>`count(*) filter (where ${a.status} = 'new')::int`, high: sql<number>`count(*) filter (where ${a.status} <> 'resolved' and ${a.severity} = 'high')::int`, acked: sql<number>`count(*) filter (where ${a.status} = 'acknowledged')::int`, resolved7: sql<number>`count(*) filter (where ${a.resolvedAt} > now() - interval '7 days')::int` }).from(a);
  return { rows, k: k! };
}
export async function listServices() {
  return db.select({ s: schema.itServices, owner: personName(schema.itServices.ownerId) }).from(schema.itServices).orderBy(asc(schema.itServices.id));
}

// ---------- Projects ----------
export async function listProjects(workspace?: string) {
  const p = schema.projects;
  return db.select({ p, owner: personName(p.ownerId), rows: sql<number>`(select count(*)::int from project_rows r where r.project_id = ${p.id})`, done: sql<number>`(select count(*)::int from project_rows r where r.project_id = ${p.id} and r.status = 'done')`, pct: sql<number>`coalesce((select avg(percent)::int from project_rows r where r.project_id = ${p.id} and r.parent_id is null), 0)` }).from(p).where(workspace ? eq(p.workspace, workspace) : undefined).orderBy(asc(p.status), asc(p.startDate));
}
export async function getProject(id: number) {
  const [p] = await db.select({ p: schema.projects, owner: personName(schema.projects.ownerId) }).from(schema.projects).where(eq(schema.projects.id, id)).limit(1);
  if (!p) return null;
  const rows = await db.select({ r: schema.projectRows, owner: personName(schema.projectRows.ownerId) }).from(schema.projectRows).where(eq(schema.projectRows.projectId, id)).orderBy(asc(schema.projectRows.position));
  const people = await db.select({ id: schema.people.id, displayName: schema.people.displayName }).from(schema.people).where(inArray(schema.people.role, ["agent", "admin", "hr", "manager"])).orderBy(asc(schema.people.displayName));
  return { ...p, rows, people };
}

// ---------- Notifications & prefs ----------
export async function listNotifications(personId: number) {
  const rows = await db.select().from(schema.notifications).where(eq(schema.notifications.personId, personId)).orderBy(desc(schema.notifications.createdAt)).limit(100);
  return rows;
}
export async function unreadCount(personId: number) {
  const [r] = await db.select({ n: count() }).from(schema.notifications).where(and(eq(schema.notifications.personId, personId), isNull(schema.notifications.readAt)));
  return r?.n ?? 0;
}
export async function getPrefs(personId: number) {
  const [r] = await db.select().from(schema.userPrefs).where(eq(schema.userPrefs.personId, personId)).limit(1);
  return r ?? { personId, hiddenModules: [] as string[], notify: {} as Record<string, { inApp: boolean; email: boolean; teams: boolean }>, updatedAt: new Date() };
}

// ---------- Reporting ----------
export async function reportingData() {
  const t = schema.tickets;
  const monthly = (await db.execute(sql`
    with m as (select generate_series(date_trunc('month', now()) - interval '11 months', date_trunc('month', now()), '1 month') mo)
    select to_char(mo, 'Mon YY') label,
      (select count(*) from tickets where date_trunc('month', created_at) = mo)::int created,
      (select count(*) from tickets where date_trunc('month', resolved_at) = mo)::int resolved,
      (select coalesce(percentile_cont(0.5) within group (order by extract(epoch from (resolved_at - created_at))/3600),0) from tickets where date_trunc('month', resolved_at) = mo)::float median_hours
    from m order by mo`)) as unknown as { label: string; created: number; resolved: number; median_hours: number }[];
  const byTeam = await db.select({ name: schema.groups.name, open: sql<number>`count(*) filter (where ${t.status} in ('open','in_progress','pending','on_hold'))::int`, resolved30: sql<number>`count(*) filter (where ${t.resolvedAt} > now() - interval '30 days')::int`, median: sql<number>`coalesce(percentile_cont(0.5) within group (order by extract(epoch from (${t.resolvedAt} - ${t.createdAt}))/3600) filter (where ${t.resolvedAt} > now() - interval '90 days'),0)::float` }).from(t).leftJoin(schema.groups, eq(schema.groups.id, t.groupId)).groupBy(schema.groups.name).orderBy(desc(sql`count(*)`));
  const byCategory = await db.select({ name: schema.categories.name, n: count(), pct: sql<number>`(count(*) filter (where ${t.resolvedAt} <= ${t.resolutionDueAt}))::float / greatest(count(*) filter (where ${t.resolvedAt} is not null),1)` }).from(t).leftJoin(schema.categories, eq(schema.categories.id, t.categoryId)).where(gte(t.createdAt, sql`now() - interval '90 days'`)).groupBy(schema.categories.name).orderBy(desc(count())).limit(10);
  const byDept = await db.select({ name: schema.people.department, n: count() }).from(t).leftJoin(schema.people, eq(schema.people.id, t.requesterId)).where(gte(t.createdAt, sql`now() - interval '90 days'`)).groupBy(schema.people.department).orderBy(desc(count())).limit(8);
  const byChannel = await db.select({ source: t.source, n: count() }).from(t).where(gte(t.createdAt, sql`now() - interval '90 days'`)).groupBy(t.source);
  const buckets = (await db.execute(sql`select b label, count(*)::int n from (select case when extract(epoch from (resolved_at - created_at))/3600 < 4 then '< 4h' when extract(epoch from (resolved_at - created_at))/3600 < 24 then '4–24h' when extract(epoch from (resolved_at - created_at))/3600 < 72 then '1–3d' when extract(epoch from (resolved_at - created_at))/3600 < 168 then '3–7d' else '> 7d' end b from tickets where resolved_at is not null) q group by b order by array_position(array['< 4h','4–24h','1–3d','3–7d','> 7d'], b)`)) as unknown as { label: string; n: number }[];
  const csat = await db.select({ score: t.satisfaction, n: count() }).from(t).where(sql`${t.satisfaction} is not null`).groupBy(t.satisfaction).orderBy(asc(t.satisfaction));
  return { monthly, byTeam, byCategory, byDept, byChannel, buckets, csat };
}

export async function slaReport() {
  const t = schema.tickets;
  const byPriority = await db
    .select({
      priority: t.priority,
      resolved: sql<number>`count(*) filter (where ${t.resolvedAt} is not null and ${t.resolvedAt} > now() - interval '90 days')::int`,
      met: sql<number>`count(*) filter (where ${t.resolvedAt} is not null and ${t.resolvedAt} > now() - interval '90 days' and ${t.resolvedAt} <= ${t.resolutionDueAt})::int`,
      frMet: sql<number>`count(*) filter (where ${t.firstRespondedAt} is not null and ${t.createdAt} > now() - interval '90 days' and ${t.firstRespondedAt} <= ${t.firstResponseDueAt})::int`,
      frTotal: sql<number>`count(*) filter (where ${t.firstRespondedAt} is not null and ${t.createdAt} > now() - interval '90 days')::int`,
      openBreached: sql<number>`count(*) filter (where ${t.status} in ('open','in_progress') and ${t.resolutionDueAt} < now())::int`,
      paused: sql<number>`count(*) filter (where ${t.status} in ('pending','on_hold'))::int`,
    })
    .from(t)
    .groupBy(t.priority)
    .orderBy(sql`case ${t.priority} when 'urgent' then 0 when 'high' then 1 when 'medium' then 2 else 3 end`);
  const weekly = (await db.execute(sql`
    with w as (select generate_series(date_trunc('week', now()) - interval '11 weeks', date_trunc('week', now()), '1 week') wk)
    select to_char(wk, 'DD Mon') label,
      (select count(*) from tickets where resolved_at is not null and date_trunc('week', resolved_at) = wk)::int total,
      (select count(*) from tickets where resolved_at is not null and date_trunc('week', resolved_at) = wk and resolved_at <= resolution_due_at)::int met
    from w order by wk`)) as unknown as { label: string; total: number; met: number }[];
  const breaches = await db
    .select({ id: t.id, subject: t.subject, priority: t.priority, assignee: personName(t.assigneeId), group: schema.groups.name, over: sql<number>`extract(epoch from (now() - ${t.resolutionDueAt}))/3600` })
    .from(t)
    .leftJoin(schema.groups, eq(schema.groups.id, t.groupId))
    .where(and(inArray(t.status, ["open", "in_progress"]), sql`${t.resolutionDueAt} < now()`))
    .orderBy(desc(sql`extract(epoch from (now() - ${t.resolutionDueAt}))`))
    .limit(10);
  return { byPriority, weekly, breaches };
}

