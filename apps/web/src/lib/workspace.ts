import "server-only";
import { cookies } from "next/headers";
import { db, schema } from "@ticketfly/db";
import { asc, eq } from "drizzle-orm";
import type { Principal } from "./auth";

export type Workspace = { slug: string; name: string; primary: boolean; icon: string };

/** Which workspaces this person may see, and which one is current. Admins see all; others only their memberships. */
export async function workspaceContext(me: Principal): Promise<{ current: Workspace; allowed: Workspace[] }> {
  const all = await db.select().from(schema.workspaces).orderBy(asc(schema.workspaces.id));
  let allowed: Workspace[];
  if (me.role === "admin") allowed = all;
  else {
    const m = await db.select({ w: schema.workspaceMembers.workspace }).from(schema.workspaceMembers).where(eq(schema.workspaceMembers.personId, me.id));
    const set = new Set(m.map((x) => x.w));
    allowed = all.filter((w) => set.has(w.slug));
    if (!allowed.length) allowed = all.filter((w) => w.primary);
  }
  const wanted = (await cookies()).get("tf_workspace")?.value;
  const current = allowed.find((w) => w.slug === wanted) ?? allowed.find((w) => w.primary) ?? allowed[0]!;
  return { current, allowed };
}
