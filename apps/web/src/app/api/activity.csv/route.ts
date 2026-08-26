import { db, schema } from "@ticketfly/db";
import { desc } from "drizzle-orm";
import { getPrincipal } from "@/lib/auth";

export async function GET() {
  const me = await getPrincipal();
  if (!me || me.role === "requester" || me.role === "manager") return new Response("forbidden", { status: 403 });
  const rows = await db.select().from(schema.activityLog).orderBy(desc(schema.activityLog.ts)).limit(10_000);
  const esc = (v: unknown) => `"${String(v ?? "").replace(/"/g, '""')}"`;
  const head = ["ts", "actor", "actor_type", "action", "category", "target_type", "target_id", "before", "after", "ip", "user_agent", "request_id", "release"];
  const body = rows.map((r) => [r.ts.toISOString(), r.actorName, r.actorType, r.action, r.category, r.targetType, r.targetId, JSON.stringify(r.before ?? null), JSON.stringify(r.after ?? null), r.ip, r.userAgent, r.requestId, r.release].map(esc).join(","));
  return new Response([head.join(","), ...body].join("\n"), { headers: { "content-type": "text/csv; charset=utf-8", "content-disposition": `attachment; filename="ticketfly-activity-${new Date().toISOString().slice(0, 10)}.csv"` } });
}
