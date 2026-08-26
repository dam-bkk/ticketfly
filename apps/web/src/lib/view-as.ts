import "server-only";
import { db, schema } from "@ticketfly/db";
import { asc } from "drizzle-orm";
import { cookies } from "next/headers";
import type { Principal } from "./auth";

/** Data for the "View as" control: only admins get it; returns the people list and who is currently being viewed. */
export async function viewAsContext(me: Principal) {
  const realId = Number((await cookies()).get("tf_persona")?.value);
  const isAdmin = me.actor ? true : me.role === "admin";
  if (!isAdmin) return null;
  const people = await db.select({ id: schema.people.id, displayName: schema.people.displayName, role: schema.people.role, jobTitle: schema.people.jobTitle, department: schema.people.department }).from(schema.people).orderBy(asc(schema.people.displayName));
  return { people: people.filter((p) => p.id !== realId), viewing: me.actor ? { id: me.id, displayName: me.displayName, role: me.role } : null };
}
