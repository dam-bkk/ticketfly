import { db, schema } from "@ticketfly/db";
import { desc, eq } from "drizzle-orm";
import { getPrincipal } from "@/lib/auth";

export async function GET() {
  const me = await getPrincipal();
  if (!me || me.role === "requester" || me.role === "manager") return new Response("forbidden", { status: 403 });
  const rows = await db.select({ t: schema.tickets, requester: schema.people.displayName, group: schema.groups.name }).from(schema.tickets).leftJoin(schema.people, eq(schema.people.id, schema.tickets.requesterId)).leftJoin(schema.groups, eq(schema.groups.id, schema.tickets.groupId)).orderBy(desc(schema.tickets.createdAt)).limit(20_000);
  const esc = (v: unknown) => `"${String(v ?? "").replace(/"/g, '""')}"`;
  const head = ["ref", "subject", "kind", "status", "priority", "requester", "group", "workspace", "created_at", "updated_at", "resolved_at", "first_response_due", "resolution_due"];
  const body = rows.map(({ t, requester, group }) => [t.ref, t.subject, t.kind, t.status, t.priority, requester, group, t.workspace, t.createdAt.toISOString(), t.updatedAt.toISOString(), t.resolvedAt?.toISOString(), t.firstResponseDueAt?.toISOString(), t.resolutionDueAt?.toISOString()].map(esc).join(","));
  return new Response([head.join(","), ...body].join("\n"), { headers: { "content-type": "text/csv; charset=utf-8", "content-disposition": `attachment; filename="tickets-${new Date().toISOString().slice(0, 10)}.csv"` } });
}
