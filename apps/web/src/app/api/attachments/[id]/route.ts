import { db, schema } from "@ticketfly/db";
import { eq } from "drizzle-orm";
import { getPrincipal } from "@/lib/auth";

export async function GET(_: Request, { params }: { params: Promise<{ id: string }> }) {
  const me = await getPrincipal();
  if (!me) return new Response("unauthenticated", { status: 401 });
  const { id } = await params;
  const [a] = await db.select().from(schema.attachments).where(eq(schema.attachments.id, Number(id))).limit(1);
  if (!a || !a.data) return new Response("not found", { status: 404 });
  // Requesters may only fetch attachments on their own tickets.
  if (me.role === "requester" || me.role === "manager") {
    const [t] = await db.select({ r: schema.tickets.requesterId }).from(schema.tickets).where(eq(schema.tickets.id, a.ticketId)).limit(1);
    if (t?.r !== me.id) return new Response("forbidden", { status: 403 });
  }
  return new Response(new Uint8Array(a.data), { headers: { "content-type": a.mime, "content-disposition": `inline; filename="${encodeURIComponent(a.name)}"`, "cache-control": "private, max-age=3600" } });
}
