import "server-only";
import { db, schema } from "@ticketfly/db";
import { and, asc, count, desc, eq, ilike, inArray, isNotNull, or, sql } from "drizzle-orm";

/** Freshservice-style inventory list with the right-hand filter panel semantics. */
export type InventoryFilter = { workspace?: string; q?: string; type?: string; status?: string; location?: string; department?: string; usedBy?: string; managedBy?: string; impact?: string; source?: string; page?: number };

export async function listInventory(f: InventoryFilter) {
  const a = schema.assets;
  const owner = schema.people;
  const conds = [];
  if (f.workspace) conds.push(eq(a.workspace, f.workspace));
  if (f.q) conds.push(or(ilike(a.name, `%${f.q}%`), ilike(a.assetTag, `%${f.q}%`), ilike(a.serial, `%${f.q}%`), ilike(a.model, `%${f.q}%`), ilike(a.hostname, `%${f.q}%`), ilike(owner.displayName, `%${f.q}%`))!);
  if (f.type) conds.push(eq(a.type, f.type as never));
  if (f.status) conds.push(eq(a.status, f.status as never));
  if (f.location) conds.push(eq(a.lastSeenCity, f.location));
  if (f.department) conds.push(eq(a.department, f.department));
  if (f.usedBy) conds.push(ilike(owner.displayName, `%${f.usedBy}%`));
  if (f.impact) conds.push(eq(a.impact, f.impact));
  if (f.source) conds.push(eq(a.source, f.source));
  if (f.managedBy) conds.push(sql`(select display_name from people m where m.id = ${a.managedById}) ilike ${"%" + f.managedBy + "%"}`);
  const where = conds.length ? and(...conds) : undefined;
  const pageSize = 50;
  const page = Math.max(1, f.page ?? 1);
  const rows = await db
    .select({
      a,
      usedBy: owner.displayName,
      usedByStatus: owner.status,
      managedBy: sql<string | null>`(select display_name from people m where m.id = ${a.managedById})`,
      softwareCount: sql<number>`(select count(*)::int from asset_software s where s.asset_id = ${a.id})`,
    })
    .from(a)
    .leftJoin(owner, eq(owner.id, a.ownerId))
    .where(where)
    .orderBy(sql`${a.lastSeenAt} desc nulls last`, asc(a.assetTag))
    .limit(pageSize)
    .offset((page - 1) * pageSize);
  const [c] = await db.select({ n: count() }).from(a).leftJoin(owner, eq(owner.id, a.ownerId)).where(where);
  const facets = {
    locations: await db.select({ v: a.lastSeenCity, n: count() }).from(a).where(isNotNull(a.lastSeenCity)).groupBy(a.lastSeenCity).orderBy(desc(count())),
    departments: await db.select({ v: a.department, n: count() }).from(a).where(isNotNull(a.department)).groupBy(a.department).orderBy(desc(count())),
    types: await db.select({ v: a.type, n: count() }).from(a).groupBy(a.type).orderBy(desc(count())),
  };
  const [k] = await db
    .select({
      total: count(),
      devices: sql<number>`count(*) filter (where ${a.type} in ('laptop','desktop','mobile','tablet'))::int`,
      nonCompliant: sql<number>`count(*) filter (where ${a.compliance} = 'non_compliant')::int`,
      unacknowledged: sql<number>`count(*) filter (where ${a.ownerId} is not null and ${a.acknowledgedAt} is null and ${a.type} in ('laptop','desktop','mobile','tablet'))::int`,
      returnedPending: sql<number>`count(*) filter (where ${a.returnedAt} is not null and ${a.ownerId} is not null)::int`,
      stale: sql<number>`count(*) filter (where ${a.type} in ('laptop','desktop') and ${a.lastSeenAt} < now() - interval '48 hours')::int`,
      offsite: sql<number>`count(*) filter (where ${a.lastSeenCity} not in ('Hong Kong','Kuala Lumpur','Singapore','Dubai','Bangkok','Manila'))::int`,
      eol: sql<number>`count(*) filter (where ${a.endOfLife} is not null and ${a.endOfLife} < now() + interval '180 days')::int`,
    })
    .from(a);
  return { rows, total: c?.n ?? 0, page, pageSize, facets, k: k! };
}

export async function getAssetFull(id: number) {
  const a = schema.assets;
  const [row] = await db.select({ a, owner: schema.people }).from(a).leftJoin(schema.people, eq(schema.people.id, a.ownerId)).where(eq(a.id, id)).limit(1);
  if (!row) return null;
  const managedBy = row.a.managedById ? (await db.select({ id: schema.people.id, displayName: schema.people.displayName }).from(schema.people).where(eq(schema.people.id, row.a.managedById)).limit(1))[0] ?? null : null;
  const managedByGroup = row.a.managedByGroupId ? (await db.select().from(schema.groups).where(eq(schema.groups.id, row.a.managedByGroupId)).limit(1))[0] ?? null : null;
  const software = await db
    .select({ id: schema.software.id, name: schema.software.name, vendor: schema.software.vendor, category: schema.software.category, licenceModel: schema.software.licenceModel, version: schema.assetSoftware.version, status: schema.assetSoftware.status, detectedAt: schema.assetSoftware.detectedAt, cost: schema.software.unitMonthlyCost })
    .from(schema.assetSoftware)
    .innerJoin(schema.software, eq(schema.software.id, schema.assetSoftware.softwareId))
    .where(eq(schema.assetSoftware.assetId, id))
    .orderBy(asc(schema.software.name));
  const assignments = await db
    .select({ x: schema.assetAssignments, person: schema.people.displayName })
    .from(schema.assetAssignments)
    .leftJoin(schema.people, eq(schema.people.id, schema.assetAssignments.personId))
    .where(eq(schema.assetAssignments.assetId, id))
    .orderBy(desc(schema.assetAssignments.assignedAt));
  const tickets = row.owner ? await db.select({ id: schema.tickets.id, subject: schema.tickets.subject, status: schema.tickets.status, kind: schema.tickets.kind, createdAt: schema.tickets.createdAt, legacyRef: schema.tickets.legacyRef }).from(schema.tickets).where(eq(schema.tickets.requesterId, row.owner.id)).orderBy(desc(schema.tickets.createdAt)).limit(8) : [];
  const activity = await db.select().from(schema.activityLog).where(and(eq(schema.activityLog.targetType, "asset"), eq(schema.activityLog.targetId, String(id)))).orderBy(desc(schema.activityLog.ts)).limit(30);
  const contracts = await db.select().from(schema.contracts).where(row.a.vendor ? ilike(schema.contracts.vendor, `%${row.a.vendor}%`) : sql`false`).limit(5);
  const pos = await db.select().from(schema.purchaseOrders).where(row.a.vendor ? ilike(schema.purchaseOrders.vendor, `%${row.a.vendor}%`) : sql`false`).limit(5);
  const peers = await db.select({ id: a.id, name: a.name, assetTag: a.assetTag, type: a.type, model: a.model }).from(a).where(and(row.owner ? eq(a.ownerId, row.owner.id) : sql`false`, sql`${a.id} <> ${id}`)).limit(6);
  const relOut = await db.select({ r: schema.assetRelationships, name: a.name, assetTag: a.assetTag, type: a.type, model: a.model }).from(schema.assetRelationships).innerJoin(a, eq(a.id, schema.assetRelationships.toAssetId)).where(eq(schema.assetRelationships.fromAssetId, id));
  const relIn = await db.select({ r: schema.assetRelationships, name: a.name, assetTag: a.assetTag, type: a.type, model: a.model }).from(schema.assetRelationships).innerJoin(a, eq(a.id, schema.assetRelationships.fromAssetId)).where(eq(schema.assetRelationships.toAssetId, id));
  const attachmentsCount = 0;
  const allAssets = await db.select({ id: a.id, name: a.name, assetTag: a.assetTag }).from(a).where(sql`${a.id} <> ${id}`).orderBy(asc(a.name)).limit(400);
  return { ...row, managedBy, managedByGroup, software, assignments, tickets, activity, contracts, pos, peers, relOut, relIn, allAssets, attachmentsCount };
}

export async function listContracts() {
  return db.select({ c: schema.contracts, owner: schema.people.displayName }).from(schema.contracts).leftJoin(schema.people, eq(schema.people.id, schema.contracts.ownerId)).orderBy(asc(schema.contracts.endDate));
}
export async function listPurchaseOrders() {
  return db.select({ p: schema.purchaseOrders, requester: schema.people.displayName }).from(schema.purchaseOrders).leftJoin(schema.people, eq(schema.people.id, schema.purchaseOrders.requesterId)).orderBy(desc(schema.purchaseOrders.orderedAt));
}

export async function myDevices(personId: number) {
  return db
    .select()
    .from(schema.assets)
    .where(and(eq(schema.assets.ownerId, personId), inArray(schema.assets.type, ["laptop", "desktop", "mobile", "tablet", "monitor", "peripheral"])))
    .orderBy(asc(schema.assets.type));
}

export async function listPickers() {
  const [people, groups] = await Promise.all([db.select({ id: schema.people.id, displayName: schema.people.displayName, department: schema.people.department, status: schema.people.status }).from(schema.people).orderBy(asc(schema.people.displayName)), db.select().from(schema.groups)]);
  return { people, groups };
}
