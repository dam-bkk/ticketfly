"use server";

import { db, schema } from "@ticketfly/db";
import { canTransition, formatTicketRef, isSlaPaused, type TicketStatus } from "@ticketfly/core";
import { eq, sql } from "drizzle-orm";
import { cookies } from "next/headers";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getPrincipal, requirePrincipal, requireStaff } from "@/lib/auth";
import { logActivity } from "@/lib/activity";

export async function setTheme(theme: "light" | "dark") {
  (await cookies()).set("tf_theme", theme, { path: "/", maxAge: 60 * 60 * 24 * 365, sameSite: "lax" });
}

export async function signInAs(personId: number) {
  const [p] = await db.select().from(schema.people).where(eq(schema.people.id, personId)).limit(1);
  if (!p) redirect("/login");
  (await cookies()).set("tf_persona", String(personId), { path: "/", httpOnly: true, sameSite: "lax", maxAge: 60 * 60 * 24 * 7 });
  await logActivity({ id: p.id, displayName: p.displayName, email: p.email, role: p.role, jobTitle: p.jobTitle, department: p.department, officeLocation: p.officeLocation }, { action: "auth.login", category: "auth", targetType: "person", targetId: p.id });
  redirect(p.role === "requester" || p.role === "manager" ? "/portal" : "/tickets");
}

export async function signOut() {
  const p = await getPrincipal();
  if (p) await logActivity(p, { action: "auth.logout", category: "auth", targetType: "person", targetId: p.id });
  (await cookies()).delete("tf_persona");
  redirect("/login");
}

export async function replyToTicket(ticketId: number, formData: FormData) {
  const me = await requirePrincipal();
  const body = String(formData.get("body") ?? "").trim();
  const kind = (formData.get("kind") === "note" ? "note" : "reply") as "note" | "reply";
  if (!body) return;
  const staff = me.role !== "requester" && me.role !== "manager";
  await db.insert(schema.ticketMessages).values({ ticketId, authorId: me.id, kind: staff ? kind : "reply", body, via: staff ? "agent" : "portal" });
  const [t] = await db.select().from(schema.tickets).where(eq(schema.tickets.id, ticketId)).limit(1);
  if (t) {
    const patch: Partial<typeof schema.tickets.$inferInsert> = { updatedAt: new Date() };
    if (staff && kind === "reply" && !t.firstRespondedAt) patch.firstRespondedAt = new Date();
    // A requester reply un-pauses a waiting ticket.
    if (!staff && t.status === "pending") {
      patch.status = "open";
      patch.slaPausedSince = null;
      if (t.slaPausedSince) patch.slaPausedMinutes = t.slaPausedMinutes + Math.round((Date.now() - t.slaPausedSince.getTime()) / 60000);
    }
    await db.update(schema.tickets).set(patch).where(eq(schema.tickets.id, ticketId));
  }
  await logActivity(me, { action: kind === "note" ? "ticket.note" : "ticket.reply", category: "ticket", targetType: "ticket", targetId: ticketId, after: { chars: body.length } });
  revalidatePath(`/tickets/${ticketId}`);
  revalidatePath(`/portal/requests/${ticketId}`);
  revalidatePath("/tickets");
}

export async function updateTicket(ticketId: number, patch: { status?: TicketStatus; priority?: "low" | "medium" | "high" | "urgent"; assigneeId?: number | null; groupId?: number | null; categoryId?: number | null }) {
  const me = await requireStaff();
  const [t] = await db.select().from(schema.tickets).where(eq(schema.tickets.id, ticketId)).limit(1);
  if (!t) return;
  const set: Partial<typeof schema.tickets.$inferInsert> = { updatedAt: new Date() };
  const before: Record<string, unknown> = {};
  const after: Record<string, unknown> = {};
  if (patch.status && patch.status !== t.status) {
    if (!canTransition(t.status, patch.status)) throw new Error(`Cannot move ${t.status} → ${patch.status}`);
    before.status = t.status;
    after.status = patch.status;
    set.status = patch.status;
    if (isSlaPaused(patch.status) && !t.slaPausedSince) set.slaPausedSince = new Date();
    if (!isSlaPaused(patch.status) && t.slaPausedSince) {
      set.slaPausedSince = null;
      set.slaPausedMinutes = t.slaPausedMinutes + Math.round((Date.now() - t.slaPausedSince.getTime()) / 60000);
    }
    if (patch.status === "resolved") set.resolvedAt = new Date();
    if (patch.status === "closed") set.closedAt = new Date();
    if (patch.status === "open" && (t.status === "resolved" || t.status === "closed")) {
      set.resolvedAt = null;
      set.closedAt = null;
    }
  }
  if (patch.priority && patch.priority !== t.priority) {
    before.priority = t.priority;
    after.priority = patch.priority;
    set.priority = patch.priority;
  }
  if (patch.assigneeId !== undefined && patch.assigneeId !== t.assigneeId) {
    before.assigneeId = t.assigneeId;
    after.assigneeId = patch.assigneeId;
    set.assigneeId = patch.assigneeId;
    if (patch.assigneeId && t.status === "open") set.status = "in_progress";
  }
  if (patch.groupId !== undefined && patch.groupId !== t.groupId) {
    before.groupId = t.groupId;
    after.groupId = patch.groupId;
    set.groupId = patch.groupId;
  }
  if (patch.categoryId !== undefined && patch.categoryId !== t.categoryId) {
    before.categoryId = t.categoryId;
    after.categoryId = patch.categoryId;
    set.categoryId = patch.categoryId;
  }
  if (Object.keys(after).length === 0) return;
  await db.update(schema.tickets).set(set).where(eq(schema.tickets.id, ticketId));
  const action = after.status ? "ticket.status.update" : after.priority ? "ticket.priority.update" : after.assigneeId !== undefined ? "ticket.assign" : "ticket.update";
  await logActivity(me, { action, category: "ticket", targetType: "ticket", targetId: ticketId, before, after });
  // System message in the timeline
  const parts: string[] = [];
  if (after.status) parts.push(`status → ${String(after.status).replace("_", " ")}`);
  if (after.priority) parts.push(`priority → ${after.priority}`);
  if (after.assigneeId !== undefined) {
    const a = after.assigneeId ? (await db.select({ n: schema.people.displayName }).from(schema.people).where(eq(schema.people.id, after.assigneeId as number)).limit(1))[0]?.n : null;
    parts.push(a ? `assigned to ${a}` : "unassigned");
  }
  if (parts.length) await db.insert(schema.ticketMessages).values({ ticketId, authorId: me.id, kind: "system", body: parts.join(" · "), via: "agent" });
  revalidatePath(`/tickets/${ticketId}`);
  revalidatePath("/tickets");
}

export async function createRequest(slug: string, formData: FormData) {
  const me = await requirePrincipal();
  const [service] = await db.select().from(schema.services).where(eq(schema.services.slug, slug)).limit(1);
  if (!service) redirect("/portal");
  const answers: Record<string, string> = {};
  for (const f of service.fields) {
    const v = formData.get(f.key);
    answers[f.key] = v === null ? "" : String(v);
    if (f.type === "toggle") answers[f.key] = v ? "Yes" : "No";
  }
  const firstText = service.fields.find((f) => f.type === "text" || f.type === "textarea");
  const headline = firstText ? answers[firstText.key]?.slice(0, 90) : "";
  const subject = service.kind === "onboarding" ? `Onboarding: ${answers.name} — ${answers.title}, ${answers.dept}` : service.kind === "offboarding" ? `Offboarding: ${answers.who}` : headline && headline.length > 8 ? headline : service.name;
  const description = service.fields.map((f) => `${f.label}: ${answers[f.key] || "—"}`).join("\n");
  const [seq] = (await db.execute(sql`select nextval('ticket_number_seq') as n`)) as unknown as { n: number | string }[];
  const ref = formatTicketRef(service.kind, Number(seq?.n));
  const [t] = await db
    .insert(schema.tickets)
    .values({ ref, kind: service.kind, subject, description, status: "open", priority: answers.blocking === "Yes" && service.defaultPriority === "medium" ? "high" : service.defaultPriority, requesterId: me.id, groupId: service.groupId, source: "portal", raw: { service: slug, answers } })
    .returning({ id: schema.tickets.id });
  const id = t!.id;
  await logActivity(me, { action: "ticket.create", category: "ticket", targetType: "ticket", targetId: id, after: { service: slug, kind: service.kind } });
  if (slug === "project-request") {
    // Enhancement: an IT project work request lands on the prioritisation grid as well as in the queue.
    const [backlog] = await db.select({ id: schema.projects.id }).from(schema.projects).where(eq(schema.projects.workspace, "pwr")).limit(1);
    if (backlog) {
      const [pos] = (await db.execute(sql`select coalesce(max(position),-1)+1 as n from project_rows where project_id = ${backlog.id}`)) as unknown as { n: number }[];
      await db.insert(schema.projectRows).values({ projectId: backlog.id, position: Number(pos?.n ?? 0), title: answers.title ?? subject, status: "not_started", endDate: answers.when || null, priority: "medium", notes: `Requested by ${me.displayName}${answers.sponsor ? ` · sponsor ${answers.sponsor}` : ""}`, ticketId: id });
    }
    await db.update(schema.tickets).set({ workspace: "pwr" }).where(eq(schema.tickets.id, id));
  }
  if (service.kind === "onboarding" && answers.join) {
    await db.insert(schema.ticketMessages).values({ ticketId: id, authorId: null, kind: "system", body: `Onboarding workflow started. Account and licences due ${answers.join} minus 5 working days.`, via: "system" });
  }
  revalidatePath("/tickets");
  redirect(`/portal/requests/${id}?new=1`);
}

export async function toggleOnboardingTask(onboardingId: number, key: string) {
  const me = await requireStaff();
  const [o] = await db.select().from(schema.onboardings).where(eq(schema.onboardings.id, onboardingId)).limit(1);
  if (!o) return;
  const tasks = o.tasks.map((t) => (t.key === key ? { ...t, status: t.status === "done" ? ("todo" as const) : ("done" as const), doneAt: t.status === "done" ? undefined : new Date().toISOString() } : t));
  await db.update(schema.onboardings).set({ tasks }).where(eq(schema.onboardings.id, onboardingId));
  await logActivity(me, { action: "workflow.task.toggle", category: "workflow", targetType: "onboarding", targetId: onboardingId, after: { key } });
  revalidatePath("/journeys/onboarding");
  revalidatePath(`/people/${o.personId}`);
}

/** Freshservice's "Mark ticket as closed": resolve then close in one step, both logged. */
export async function closeTicket(ticketId: number) {
  const me = await requireStaff();
  const [t] = await db.select({ status: schema.tickets.status }).from(schema.tickets).where(eq(schema.tickets.id, ticketId)).limit(1);
  if (!t || t.status === "closed") return;
  if (t.status !== "resolved") await updateTicket(ticketId, { status: "resolved" });
  await updateTicket(ticketId, { status: "closed" });
  void me;
}


/** "View as" — admins only. Persists until Exit; every page follows the viewed person's role. */
export async function setViewAs(personId: number | null) {
  const jar = await cookies();
  const realId = Number(jar.get("tf_persona")?.value);
  const [real] = realId ? await db.select({ role: schema.people.role, displayName: schema.people.displayName }).from(schema.people).where(eq(schema.people.id, realId)).limit(1) : [];
  if (!real || real.role !== "admin") return;
  if (!personId) {
    jar.delete("tf_view_as");
    jar.delete("tf_workspace");
    redirect("/tickets");
  }
  const [target] = await db.select({ id: schema.people.id, role: schema.people.role, displayName: schema.people.displayName }).from(schema.people).where(eq(schema.people.id, personId)).limit(1);
  if (!target) return;
  jar.set("tf_view_as", String(personId), { path: "/", httpOnly: true, sameSite: "lax", maxAge: 60 * 60 * 8 });
  jar.delete("tf_workspace");
  await logActivity({ id: realId, displayName: real.displayName, email: "", role: "admin", jobTitle: null, department: null, officeLocation: null }, { action: "auth.view_as", category: "auth", targetType: "person", targetId: personId, after: { as: target.displayName, role: target.role } });
  redirect(target.role === "requester" || target.role === "manager" ? "/portal" : "/tickets");
}
