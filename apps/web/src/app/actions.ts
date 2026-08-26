"use server";

import { db, schema } from "@ticketfly/db";
import { canTransition, isSlaPaused, type TicketStatus } from "@ticketfly/core";
import { eq } from "drizzle-orm";
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
  redirect(p.role === "requester" || p.role === "manager" ? "/portal" : "/inbox");
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
  revalidatePath("/inbox");
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
  revalidatePath("/inbox");
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
  const [t] = await db
    .insert(schema.tickets)
    .values({ kind: service.kind, subject, description, status: "open", priority: answers.blocking === "Yes" && service.defaultPriority === "medium" ? "high" : service.defaultPriority, requesterId: me.id, groupId: service.groupId, source: "portal", raw: { service: slug, answers } })
    .returning({ id: schema.tickets.id });
  const id = t!.id;
  await logActivity(me, { action: "ticket.create", category: "ticket", targetType: "ticket", targetId: id, after: { service: slug, kind: service.kind } });
  if (service.kind === "onboarding" && answers.join) {
    await db.insert(schema.ticketMessages).values({ ticketId: id, authorId: null, kind: "system", body: `Onboarding workflow started. Account and licences due ${answers.join} minus 5 working days.`, via: "system" });
  }
  revalidatePath("/inbox");
  redirect(`/portal/requests/${id}?new=1`);
}

export async function toggleOnboardingTask(onboardingId: number, key: string) {
  const me = await requireStaff();
  const [o] = await db.select().from(schema.onboardings).where(eq(schema.onboardings.id, onboardingId)).limit(1);
  if (!o) return;
  const tasks = o.tasks.map((t) => (t.key === key ? { ...t, status: t.status === "done" ? ("todo" as const) : ("done" as const), doneAt: t.status === "done" ? undefined : new Date().toISOString() } : t));
  await db.update(schema.onboardings).set({ tasks }).where(eq(schema.onboardings.id, onboardingId));
  await logActivity(me, { action: "workflow.task.toggle", category: "workflow", targetType: "onboarding", targetId: onboardingId, after: { key } });
  revalidatePath("/onboarding");
  revalidatePath(`/people/${o.personId}`);
}
