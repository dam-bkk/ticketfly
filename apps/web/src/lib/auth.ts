import "server-only";
import { cookies, headers } from "next/headers";
import { redirect } from "next/navigation";
import { db, schema } from "@ticketfly/db";
import { eq } from "drizzle-orm";

/**
 * Dev-mode identity: a persona cookie stands in for the Entra ID OIDC session.
 * Production swaps this for the openid-client session lookup; call sites do not change.
 */
export type Principal = {
  id: number;
  displayName: string;
  email: string;
  role: "requester" | "agent" | "admin" | "hr" | "manager";
  jobTitle: string | null;
  department: string | null;
  officeLocation: string | null;
  /** Set when an admin is using "View as": the real signed-in admin. */
  actor?: { id: number; displayName: string };
};

async function loadPerson(id: number) {
  const [p] = await db.select().from(schema.people).where(eq(schema.people.id, id)).limit(1);
  return p ?? null;
}

/**
 * Identity for this request. "View as" (PolyQi pattern): an admin can render the app from any person's seat;
 * authorisation follows the viewed person, the activity log keeps the admin as the actor.
 */
export async function getPrincipal(): Promise<Principal | null> {
  const jar = await cookies();
  const id = Number(jar.get("tf_persona")?.value);
  if (!id) return null;
  const real = await loadPerson(id);
  if (!real) return null;
  const base = (p: NonNullable<typeof real>): Principal => ({ id: p.id, displayName: p.displayName, email: p.email, role: p.role, jobTitle: p.jobTitle, department: p.department, officeLocation: p.officeLocation });
  const viewAs = Number(jar.get("tf_view_as")?.value);
  if (viewAs && viewAs !== real.id && real.role === "admin") {
    const target = await loadPerson(viewAs);
    if (target) return { ...base(target), actor: { id: real.id, displayName: real.displayName } };
  }
  return base(real);
}

export async function requirePrincipal(): Promise<Principal> {
  const p = await getPrincipal();
  if (!p) redirect("/login");
  return p;
}

export async function requireStaff(): Promise<Principal> {
  const p = await requirePrincipal();
  if (p.role === "requester" || p.role === "manager") redirect("/portal");
  return p;
}

export function isStaff(p: Principal): boolean {
  return p.role === "agent" || p.role === "admin" || p.role === "hr";
}

export async function requestMeta(): Promise<{ ip: string | null; userAgent: string | null; requestId: string }> {
  const h = await headers();
  return {
    ip: h.get("x-forwarded-for")?.split(",")[0]?.trim() ?? h.get("x-real-ip") ?? "127.0.0.1",
    userAgent: h.get("user-agent"),
    requestId: `req_${Math.random().toString(36).slice(2, 10)}`,
  };
}

export const APP_VERSION = process.env.APP_VERSION ?? "0.3.1";
export const APP_ENV = process.env.APP_ENV ?? "dev";
