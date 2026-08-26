import "server-only";
import { db, schema } from "@ticketfly/db";
import { and, asc, count, desc, eq, gte, ilike, inArray, isNull, lt, or, sql } from "drizzle-orm";
import { subDays } from "date-fns";
import { slaFor } from "./sla";

export type InboxFilter = "open" | "mine" | "unassigned" | "at_risk" | "waiting" | "resolved" | "all" | "legacy";

export async function listInbox(opts: { filter: InboxFilter; meId: number; q?: string; groupId?: number; limit?: number }) {
  const t = schema.tickets;
  const conds = [];
  const openStatuses = ["open", "in_progress", "pending", "on_hold"] as const;
  switch (opts.filter) {
    case "open":
      conds.push(inArray(t.status, [...openStatuses]));
      break;
    case "mine":
      conds.push(eq(t.assigneeId, opts.meId), inArray(t.status, [...openStatuses]));
      break;
    case "unassigned":
      conds.push(isNull(t.assigneeId), inArray(t.status, [...openStatuses]));
      break;
    case "waiting":
      conds.push(inArray(t.status, ["pending", "on_hold"]));
      break;
    case "at_risk":
      conds.push(inArray(t.status, ["open", "in_progress"]), or(lt(t.resolutionDueAt, new Date(Date.now() + 24 * 3600_000)), and(isNull(t.firstRespondedAt), lt(t.firstResponseDueAt, new Date(Date.now() + 60 * 60_000))))!);
      break;
    case "resolved":
      conds.push(inArray(t.status, ["resolved", "closed"]), gte(t.updatedAt, subDays(new Date(), 14)));
      break;
    case "legacy":
      conds.push(sql`${t.legacyRef} is not null`);
      break;
    case "all":
      break;
  }
  if (opts.groupId) conds.push(eq(t.groupId, opts.groupId));
  if (opts.q) conds.push(or(ilike(t.subject, `%${opts.q}%`), ilike(t.legacyRef, `%${opts.q}%`), sql`${t.search} @@ plainto_tsquery('english', ${opts.q})`)!);
  const rows = await db
    .select({
      id: t.id,
      legacyRef: t.legacyRef,
      kind: t.kind,
      subject: t.subject,
      status: t.status,
      priority: t.priority,
      createdAt: t.createdAt,
      updatedAt: t.updatedAt,
      firstRespondedAt: t.firstRespondedAt,
      resolvedAt: t.resolvedAt,
      slaPausedSince: t.slaPausedSince,
      slaPausedMinutes: t.slaPausedMinutes,
      tags: t.tags,
      source: t.source,
      requester: schema.people.displayName,
      requesterDept: schema.people.department,
      assigneeId: t.assigneeId,
      assignee: sql<string | null>`(select display_name from people a where a.id = ${t.assigneeId})`,
      groupName: schema.groups.name,
      messageCount: sql<number>`(select count(*)::int from ticket_messages m where m.ticket_id = ${t.id} and m.kind <> 'system')`,
    })
    .from(t)
    .leftJoin(schema.people, eq(schema.people.id, t.requesterId))
    .leftJoin(schema.groups, eq(schema.groups.id, t.groupId))
    .where(conds.length ? and(...conds) : undefined)
    .orderBy(opts.filter === "resolved" || opts.filter === "legacy" ? desc(t.updatedAt) : sql`case ${t.priority} when 'urgent' then 0 when 'high' then 1 when 'medium' then 2 else 3 end`, desc(t.updatedAt))
    .limit(opts.limit ?? 200);
  return rows.map((r) => ({ ...r, sla: slaFor(r, r.firstRespondedAt ? "resolution" : "first_response") }));
}

export async function inboxCounts(meId: number) {
  const t = schema.tickets;
  const open = ["open", "in_progress", "pending", "on_hold"] as const;
  const [row] = await db
    .select({
      open: sql<number>`count(*) filter (where ${t.status} in ('open','in_progress','pending','on_hold'))::int`,
      mine: sql<number>`count(*) filter (where ${t.assigneeId} = ${meId} and ${t.status} in ('open','in_progress','pending','on_hold'))::int`,
      unassigned: sql<number>`count(*) filter (where ${t.assigneeId} is null and ${t.status} in ('open','in_progress','pending','on_hold'))::int`,
      waiting: sql<number>`count(*) filter (where ${t.status} in ('pending','on_hold'))::int`,
      atRisk: sql<number>`count(*) filter (where ${t.status} in ('open','in_progress') and (${t.resolutionDueAt} < now() + interval '24 hours' or (${t.firstRespondedAt} is null and ${t.firstResponseDueAt} < now() + interval '1 hour')))::int`,
      legacy: sql<number>`count(*) filter (where ${t.legacyRef} is not null)::int`,
    })
    .from(t);
  void open;
  return row!;
}

export async function getTicket(id: number) {
  const t = schema.tickets;
  const [row] = await db
    .select({
      ticket: t,
      requester: schema.people,
      groupName: schema.groups.name,
      categoryName: schema.categories.name,
    })
    .from(t)
    .leftJoin(schema.people, eq(schema.people.id, t.requesterId))
    .leftJoin(schema.groups, eq(schema.groups.id, t.groupId))
    .leftJoin(schema.categories, eq(schema.categories.id, t.categoryId))
    .where(eq(t.id, id))
    .limit(1);
  if (!row) return null;
  const messages = await db
    .select({ m: schema.ticketMessages, author: schema.people.displayName, authorRole: schema.people.role })
    .from(schema.ticketMessages)
    .leftJoin(schema.people, eq(schema.people.id, schema.ticketMessages.authorId))
    .where(eq(schema.ticketMessages.ticketId, id))
    .orderBy(asc(schema.ticketMessages.createdAt));
  const assignee = row.ticket.assigneeId ? (await db.select().from(schema.people).where(eq(schema.people.id, row.ticket.assigneeId)).limit(1))[0] ?? null : null;
  const manager = row.requester?.managerId ? (await db.select({ displayName: schema.people.displayName }).from(schema.people).where(eq(schema.people.id, row.requester.managerId)).limit(1))[0] ?? null : null;
  const devices = row.requester ? await db.select().from(schema.assets).where(and(eq(schema.assets.ownerId, row.requester.id), inArray(schema.assets.type, ["laptop", "desktop", "mobile", "tablet"]))) : [];
  const recent = row.requester
    ? await db
        .select({ id: t.id, subject: t.subject, status: t.status, createdAt: t.createdAt, legacyRef: t.legacyRef })
        .from(t)
        .where(and(eq(t.requesterId, row.requester.id), sql`${t.id} <> ${id}`))
        .orderBy(desc(t.createdAt))
        .limit(5)
    : [];
  const activity = await db.select().from(schema.activityLog).where(and(eq(schema.activityLog.targetType, "ticket"), eq(schema.activityLog.targetId, String(id)))).orderBy(desc(schema.activityLog.ts)).limit(20);
  return { ...row, messages, assignee, manager, devices, recent, activity, sla: { first: slaFor(row.ticket, "first_response"), resolution: slaFor(row.ticket, "resolution") } };
}

export async function getTicketByLegacyRef(ref: string) {
  const [row] = await db.select({ id: schema.tickets.id }).from(schema.tickets).where(eq(schema.tickets.legacyRef, ref.toUpperCase())).limit(1);
  return row ?? null;
}

export async function listAgents() {
  return db.select({ id: schema.people.id, displayName: schema.people.displayName, jobTitle: schema.people.jobTitle }).from(schema.people).where(inArray(schema.people.role, ["agent", "admin"])).orderBy(asc(schema.people.displayName));
}
export async function listGroups() {
  return db.select().from(schema.groups).orderBy(asc(schema.groups.id));
}
export async function listCategories() {
  return db.select().from(schema.categories).orderBy(asc(schema.categories.name));
}

export async function dashboardStats() {
  const t = schema.tickets;
  const [k] = await db
    .select({
      open: sql<number>`count(*) filter (where ${t.status} in ('open','in_progress','pending','on_hold'))::int`,
      unassigned: sql<number>`count(*) filter (where ${t.assigneeId} is null and ${t.status} in ('open','in_progress'))::int`,
      breached: sql<number>`count(*) filter (where ${t.status} in ('open','in_progress') and ${t.resolutionDueAt} < now())::int`,
      atRisk: sql<number>`count(*) filter (where ${t.status} in ('open','in_progress') and ${t.resolutionDueAt} between now() and now() + interval '24 hours')::int`,
      resolved7: sql<number>`count(*) filter (where ${t.resolvedAt} > now() - interval '7 days')::int`,
      created7: sql<number>`count(*) filter (where ${t.createdAt} > now() - interval '7 days')::int`,
      medianFirstResponseMin: sql<number>`coalesce(percentile_cont(0.5) within group (order by extract(epoch from (${t.firstRespondedAt} - ${t.createdAt}))/60) filter (where ${t.firstRespondedAt} > now() - interval '30 days'), 0)::int`,
      csat: sql<number>`coalesce(avg(${t.satisfaction}) filter (where ${t.closedAt} > now() - interval '30 days'), 0)::float`,
      csatN: sql<number>`count(${t.satisfaction}) filter (where ${t.closedAt} > now() - interval '30 days')::int`,
      slaMet: sql<number>`count(*) filter (where ${t.resolvedAt} is not null and ${t.resolvedAt} <= ${t.resolutionDueAt} and ${t.resolvedAt} > now() - interval '30 days')::int`,
      slaTotal: sql<number>`count(*) filter (where ${t.resolvedAt} is not null and ${t.resolvedAt} > now() - interval '30 days')::int`,
    })
    .from(t);
  const daily = await db.execute(sql`
    with days as (select generate_series((now() - interval '29 days')::date, now()::date, '1 day')::date d)
    select to_char(d, 'DD Mon') as label,
      (select count(*) from tickets where created_at::date = d)::int as created,
      (select count(*) from tickets where resolved_at::date = d)::int as resolved
    from days order by d`);
  const byCategory = await db
    .select({ name: schema.categories.name, n: count() })
    .from(t)
    .leftJoin(schema.categories, eq(schema.categories.id, t.categoryId))
    .where(gte(t.createdAt, subDays(new Date(), 30)))
    .groupBy(schema.categories.name)
    .orderBy(desc(count()))
    .limit(8);
  const workload = await db
    .select({
      id: schema.people.id,
      name: schema.people.displayName,
      title: schema.people.jobTitle,
      open: sql<number>`count(*) filter (where ${t.status} in ('open','in_progress','pending','on_hold'))::int`,
      urgent: sql<number>`count(*) filter (where ${t.status} in ('open','in_progress') and ${t.priority} in ('urgent','high'))::int`,
      resolved7: sql<number>`count(*) filter (where ${t.resolvedAt} > now() - interval '7 days')::int`,
    })
    .from(schema.people)
    .leftJoin(t, eq(t.assigneeId, schema.people.id))
    .where(inArray(schema.people.role, ["agent", "admin"]))
    .groupBy(schema.people.id)
    .orderBy(desc(sql`count(*) filter (where ${t.status} in ('open','in_progress','pending','on_hold'))`));
  const bySource = await db.select({ source: t.source, n: count() }).from(t).where(gte(t.createdAt, subDays(new Date(), 30))).groupBy(t.source);
  return { k: k!, daily: daily as unknown as { label: string; created: number; resolved: number }[], byCategory, workload, bySource };
}

export async function listAssets(opts: { q?: string; type?: string; status?: string }) {
  const a = schema.assets;
  const conds = [];
  if (opts.q) conds.push(or(ilike(a.name, `%${opts.q}%`), ilike(a.assetTag, `%${opts.q}%`), ilike(a.serial, `%${opts.q}%`), ilike(a.model, `%${opts.q}%`))!);
  if (opts.type) conds.push(eq(a.type, opts.type as never));
  if (opts.status) conds.push(eq(a.status, opts.status as never));
  const rows = await db
    .select({ a, owner: schema.people.displayName, ownerDept: schema.people.department, softwareCount: sql<number>`(select count(*)::int from asset_software s where s.asset_id = ${a.id})` })
    .from(a)
    .leftJoin(schema.people, eq(schema.people.id, a.ownerId))
    .where(conds.length ? and(...conds) : undefined)
    .orderBy(sql`${a.lastSeenAt} desc nulls last`, asc(a.assetTag))
    .limit(300);
  const [k] = await db
    .select({
      total: count(),
      devices: sql<number>`count(*) filter (where ${a.type} in ('laptop','desktop','mobile','tablet'))::int`,
      compliant: sql<number>`count(*) filter (where ${a.compliance} = 'compliant')::int`,
      nonCompliant: sql<number>`count(*) filter (where ${a.compliance} = 'non_compliant')::int`,
      offsite: sql<number>`count(*) filter (where ${a.lastSeenCity} is not null and ${a.lastSeenCity} not in ('Hong Kong','Kuala Lumpur','Singapore','Dubai','Bangkok','Manila'))::int`,
      stock: sql<number>`count(*) filter (where ${a.status} = 'in_stock')::int`,
      stale: sql<number>`count(*) filter (where ${a.type} in ('laptop','desktop') and ${a.lastSeenAt} < now() - interval '48 hours')::int`,
    })
    .from(a);
  const byCity = await db.select({ city: a.lastSeenCity, n: count() }).from(a).where(and(inArray(a.type, ["laptop", "desktop", "mobile", "tablet"]), eq(a.status, "in_use"))).groupBy(a.lastSeenCity).orderBy(desc(count()));
  return { rows, k: k!, byCity };
}

export async function getAsset(id: number) {
  const [row] = await db.select({ a: schema.assets, owner: schema.people }).from(schema.assets).leftJoin(schema.people, eq(schema.people.id, schema.assets.ownerId)).where(eq(schema.assets.id, id)).limit(1);
  if (!row) return null;
  const software = await db
    .select({ name: schema.software.name, vendor: schema.software.vendor, category: schema.software.category, licenceModel: schema.software.licenceModel, version: schema.assetSoftware.version, detectedAt: schema.assetSoftware.detectedAt, cost: schema.software.unitMonthlyCost })
    .from(schema.assetSoftware)
    .innerJoin(schema.software, eq(schema.software.id, schema.assetSoftware.softwareId))
    .where(eq(schema.assetSoftware.assetId, id))
    .orderBy(asc(schema.software.name));
  const tickets = row.owner ? await db.select({ id: schema.tickets.id, subject: schema.tickets.subject, status: schema.tickets.status, createdAt: schema.tickets.createdAt }).from(schema.tickets).where(eq(schema.tickets.requesterId, row.owner.id)).orderBy(desc(schema.tickets.createdAt)).limit(5) : [];
  return { ...row, software, tickets };
}

export async function softwareEstate() {
  const s = schema.software;
  const rows = await db
    .select({
      id: s.id,
      name: s.name,
      vendor: s.vendor,
      category: s.category,
      licenceModel: s.licenceModel,
      unitMonthlyCost: s.unitMonthlyCost,
      seatsOwned: s.seatsOwned,
      installs: sql<number>`(select count(*)::int from asset_software x where x.software_id = ${s.id})`,
      versions: sql<{ version: string; n: number }[]>`(select coalesce(json_agg(json_build_object('version', v, 'n', n) order by n desc), '[]'::json) from (select version v, count(*) n from asset_software x where x.software_id = ${s.id} group by version) q)`,
    })
    .from(s)
    .orderBy(desc(sql`(select count(*) from asset_software x where x.software_id = ${s.id})`));
  return rows;
}

export async function listPeople(opts: { q?: string; status?: string }) {
  const p = schema.people;
  const conds = [];
  if (opts.q) conds.push(or(ilike(p.displayName, `%${opts.q}%`), ilike(p.email, `%${opts.q}%`), ilike(p.department, `%${opts.q}%`))!);
  if (opts.status) conds.push(eq(p.status, opts.status as never));
  return db
    .select({
      p,
      devices: sql<number>`(select count(*)::int from assets a where a.owner_id = ${p.id} and a.type in ('laptop','desktop','mobile','tablet'))`,
      grants: sql<number>`(select count(*)::int from access_grants g where g.person_id = ${p.id} and g.revoked_at is null)`,
      monthly: sql<number>`(select coalesce(sum(monthly_cost),0)::float from access_grants g where g.person_id = ${p.id} and g.revoked_at is null)`,
      openTickets: sql<number>`(select count(*)::int from tickets t where t.requester_id = ${p.id} and t.status in ('open','in_progress','pending','on_hold'))`,
    })
    .from(p)
    .where(conds.length ? and(...conds) : undefined)
    .orderBy(sql`case ${p.status} when 'onboarding' then 0 when 'offboarding' then 1 else 2 end`, asc(p.displayName))
    .limit(200);
}

export async function getPerson(id: number) {
  const [p] = await db.select().from(schema.people).where(eq(schema.people.id, id)).limit(1);
  if (!p) return null;
  const manager = p.managerId ? (await db.select({ id: schema.people.id, displayName: schema.people.displayName }).from(schema.people).where(eq(schema.people.id, p.managerId)).limit(1))[0] ?? null : null;
  const devices = await db.select().from(schema.assets).where(eq(schema.assets.ownerId, id));
  const grants = await db.select().from(schema.accessGrants).where(eq(schema.accessGrants.personId, id)).orderBy(asc(schema.accessGrants.system));
  const tickets = await db.select({ id: schema.tickets.id, subject: schema.tickets.subject, status: schema.tickets.status, createdAt: schema.tickets.createdAt, legacyRef: schema.tickets.legacyRef, kind: schema.tickets.kind }).from(schema.tickets).where(eq(schema.tickets.requesterId, id)).orderBy(desc(schema.tickets.createdAt)).limit(10);
  const [onboarding] = await db.select().from(schema.onboardings).where(eq(schema.onboardings.personId, id)).limit(1);
  const cloneFrom = onboarding?.cloneFromPersonId ? (await db.select({ id: schema.people.id, displayName: schema.people.displayName }).from(schema.people).where(eq(schema.people.id, onboarding.cloneFromPersonId)).limit(1))[0] ?? null : null;
  return { p, manager, devices, grants, tickets, onboarding: onboarding ?? null, cloneFrom };
}

export async function listOnboardings() {
  const rows = await db
    .select({ o: schema.onboardings, person: schema.people, ticketStatus: schema.tickets.status })
    .from(schema.onboardings)
    .innerJoin(schema.people, eq(schema.people.id, schema.onboardings.personId))
    .leftJoin(schema.tickets, eq(schema.tickets.id, schema.onboardings.ticketId))
    .orderBy(asc(schema.onboardings.joinDate));
  return rows;
}

export async function listServices() {
  return db.select().from(schema.services).orderBy(desc(schema.services.popular), asc(schema.services.id));
}
export async function getService(slug: string) {
  const [s] = await db.select().from(schema.services).where(eq(schema.services.slug, slug)).limit(1);
  return s ?? null;
}
export async function listPeopleForPicker() {
  return db.select({ id: schema.people.id, displayName: schema.people.displayName, jobTitle: schema.people.jobTitle, department: schema.people.department }).from(schema.people).where(eq(schema.people.status, "active")).orderBy(asc(schema.people.displayName));
}

export async function myRequests(meId: number) {
  const t = schema.tickets;
  return db
    .select({ id: t.id, subject: t.subject, status: t.status, kind: t.kind, createdAt: t.createdAt, updatedAt: t.updatedAt, assignee: sql<string | null>`(select display_name from people a where a.id = ${t.assigneeId})`, lastMessageAt: sql<Date | null>`(select max(created_at) from ticket_messages m where m.ticket_id = ${t.id})` })
    .from(t)
    .where(eq(t.requesterId, meId))
    .orderBy(sql`case when ${t.status} in ('open','in_progress','pending','on_hold') then 0 else 1 end`, desc(t.updatedAt))
    .limit(50);
}

export async function activityLogPage(opts: { category?: string; q?: string; page?: number; pageSize?: number }) {
  const a = schema.activityLog;
  const conds = [];
  if (opts.category) conds.push(eq(a.category, opts.category));
  if (opts.q) conds.push(or(ilike(a.actorName, `%${opts.q}%`), ilike(a.action, `%${opts.q}%`), ilike(a.targetId, `%${opts.q}%`), ilike(a.ip, `%${opts.q}%`))!);
  const pageSize = opts.pageSize ?? 50;
  const page = Math.max(1, opts.page ?? 1);
  const where = conds.length ? and(...conds) : undefined;
  const rows = await db.select().from(a).where(where).orderBy(desc(a.ts)).limit(pageSize).offset((page - 1) * pageSize);
  const [cnt] = await db.select({ n: count() }).from(a).where(where);
  const n = cnt?.n ?? 0;
  const cats = await db.select({ category: a.category, n: count() }).from(a).groupBy(a.category).orderBy(desc(count()));
  return { rows, total: n, page, pageSize, cats };
}

export async function listReleases() {
  return db.select().from(schema.releases).orderBy(desc(schema.releases.releasedAt));
}
export async function listJobs() {
  return db.select().from(schema.systemJobs).orderBy(asc(schema.systemJobs.id));
}
export async function listSlaPolicies() {
  return db.select().from(schema.slaPolicies).orderBy(sql`case ${schema.slaPolicies.priority} when 'urgent' then 0 when 'high' then 1 when 'medium' then 2 else 3 end`);
}
export async function dbStats() {
  const [r] = (await db.execute(sql`select
    (select count(*) from tickets)::int as tickets,
    (select count(*) from tickets where legacy_ref is not null)::int as legacy,
    (select count(*) from ticket_messages)::int as messages,
    (select count(*) from people)::int as people,
    (select count(*) from assets)::int as assets,
    (select count(*) from activity_log)::int as activity,
    pg_size_pretty(pg_database_size(current_database())) as size`)) as unknown as { tickets: number; legacy: number; messages: number; people: number; assets: number; activity: number; size: string }[];
  return r!;
}

export async function globalSearch(q: string) {
  const term = q.trim();
  if (!term) return { tickets: [], people: [], assets: [] };
  const t = schema.tickets;
  const tickets = await db
    .select({ id: t.id, legacyRef: t.legacyRef, subject: t.subject, status: t.status, createdAt: t.createdAt, requester: schema.people.displayName, rank: sql<number>`ts_rank(${t.search}, plainto_tsquery('english', ${term}))` })
    .from(t)
    .leftJoin(schema.people, eq(schema.people.id, t.requesterId))
    .where(or(sql`${t.search} @@ plainto_tsquery('english', ${term})`, ilike(t.legacyRef, `%${term}%`), ilike(t.subject, `%${term}%`), sql`'TF-' || lpad(${t.id}::text, 6, '0') ilike ${"%" + term + "%"}`))
    .orderBy(desc(sql`ts_rank(${t.search}, plainto_tsquery('english', ${term}))`), desc(t.createdAt))
    .limit(12);
  const people = await db.select({ id: schema.people.id, displayName: schema.people.displayName, jobTitle: schema.people.jobTitle, department: schema.people.department, status: schema.people.status }).from(schema.people).where(or(ilike(schema.people.displayName, `%${term}%`), ilike(schema.people.email, `%${term}%`))).limit(6);
  const assets = await db.select({ id: schema.assets.id, name: schema.assets.name, assetTag: schema.assets.assetTag, model: schema.assets.model, type: schema.assets.type }).from(schema.assets).where(or(ilike(schema.assets.name, `%${term}%`), ilike(schema.assets.assetTag, `%${term}%`), ilike(schema.assets.serial, `%${term}%`))).limit(6);
  return { tickets, people, assets };
}
