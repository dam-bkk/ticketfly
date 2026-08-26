import { db, schema } from "@ticketfly/db";
import { eq } from "drizzle-orm";
import { getPrincipal } from "@/lib/auth";

export async function GET() {
  const me = await getPrincipal();
  if (!me || me.role === "requester" || me.role === "manager") return new Response("forbidden", { status: 403 });
  const rows = await db.select({ a: schema.assets, usedBy: schema.people.displayName }).from(schema.assets).leftJoin(schema.people, eq(schema.people.id, schema.assets.ownerId));
  const esc = (v: unknown) => `"${String(v ?? "").replace(/"/g, '""')}"`;
  const head = ["display_name", "asset_tag", "asset_type", "model", "serial", "location", "used_by", "department", "state", "compliance", "os", "os_version", "last_seen_at", "acknowledged_at", "returned_at", "end_of_life", "cost"];
  const body = rows.map(({ a, usedBy }) => [a.hostname ?? a.name, a.assetTag, a.type, a.model, a.serial, a.lastSeenCity, usedBy, a.department, a.status, a.compliance, a.os, a.osVersion, a.lastSeenAt?.toISOString(), a.acknowledgedAt?.toISOString(), a.returnedAt?.toISOString(), a.endOfLife, a.cost].map(esc).join(","));
  return new Response([head.join(","), ...body].join("\n"), { headers: { "content-type": "text/csv; charset=utf-8", "content-disposition": `attachment; filename="ticketfly-assets-${new Date().toISOString().slice(0, 10)}.csv"` } });
}
