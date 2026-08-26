"use server";

import { db, schema } from "@ticketfly/db";
import { and, eq, sql } from "drizzle-orm";
import { cookies } from "next/headers";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requirePrincipal, requireStaff } from "@/lib/auth";
import { logActivity } from "@/lib/activity";
import { runRule } from "@/lib/automation";
import { replyToTicket, updateTicket } from "./actions";

// ---------- Attachments ----------
export async function uploadAttachment(ticketId: number, fd: FormData) {
  const me = await requirePrincipal();
  const files = fd.getAll("files").filter((f): f is File => f instanceof File && f.size > 0);
  if (!files.length) return;
  for (const f of files) {
    if (f.size > 40 * 1024 * 1024) continue; // Freshservice's own limit; Blob adapter lifts it later
    const data = Buffer.from(await f.arrayBuffer());
    await db.insert(schema.attachments).values({ ticketId, name: f.name, mime: f.type || "application/octet-stream", size: f.size, data, uploadedBy: me.id });
  }
  await db.insert(schema.ticketMessages).values({ ticketId, authorId: me.id, kind: "system", body: `attached ${files.map((f) => f.name).join(", ")}`, via: "agent" });
  await logActivity(me, { action: "ticket.attach", category: "ticket", targetType: "ticket", targetId: ticketId, after: { files: files.map((f) => f.name) } });
  revalidatePath(`/tickets/${ticketId}`);
  revalidatePath(`/portal/requests/${ticketId}`);
}

// ---------- Scenarios ----------
export async function applyScenario(ticketId: number, key: string) {
  const me = await requireStaff();
  const groups = await db.select().from(schema.groups);
  const gid = (n: string) => groups.find((g) => g.name === n)?.id ?? null;
  const fd = new FormData();
  switch (key) {
    case "escalate-network":
      fd.set("kind", "note");
      fd.set("body", "Escalated to Cloud Infrastructure Support (Infra) for investigation.");
      await replyToTicket(ticketId, fd);
      await updateTicket(ticketId, { groupId: gid("Cloud Infrastructure Support"), priority: "high", assigneeId: null });
      break;
    case "escalate-identity":
      fd.set("kind", "note");
      fd.set("body", "Escalated to the Security Operations Centre.");
      await replyToTicket(ticketId, fd);
      await updateTicket(ticketId, { groupId: gid("Security Operations Centre"), assigneeId: null });
      break;
    case "need-info":
      fd.set("kind", "reply");
      fd.set("body", "Could you tell me when this started, whether it happens on the office network as well as at home, and send a screenshot if you can? I will pick it up as soon as you reply.");
      await replyToTicket(ticketId, fd);
      await updateTicket(ticketId, { status: "pending" });
      break;
    case "duplicate":
      fd.set("kind", "reply");
      fd.set("body", "This is being handled on another ticket — you will get updates there. Closing this one so it does not split the conversation.");
      await replyToTicket(ticketId, fd);
      await updateTicket(ticketId, { status: "resolved" });
      break;
  }
  await logActivity(me, { action: "ticket.scenario", category: "ticket", targetType: "ticket", targetId: ticketId, after: { scenario: key } });
  revalidatePath(`/tickets/${ticketId}`);
}

// ---------- Automation admin ----------
export async function toggleRule(key: string) {
  const me = await requireStaff();
  const [r] = await db.select().from(schema.automationRules).where(eq(schema.automationRules.key, key)).limit(1);
  if (!r) return;
  await db.update(schema.automationRules).set({ enabled: !r.enabled }).where(eq(schema.automationRules.key, key));
  await logActivity(me, { action: "automation.toggle", category: "settings", targetType: "rule", targetId: key, before: { enabled: r.enabled }, after: { enabled: !r.enabled } });
  revalidatePath("/admin/automation");
}
export async function runRuleNow(key: string) {
  const me = await requireStaff();
  const result = await runRule(key);
  await logActivity(me, { action: "automation.run", category: "settings", targetType: "rule", targetId: key, after: { result } });
  revalidatePath("/admin/automation");
  revalidatePath("/tickets");
}

// ---------- Asset relationships ----------
export async function addRelationship(fromAssetId: number, fd: FormData) {
  const me = await requireStaff();
  const toAssetId = Number(fd.get("toAssetId"));
  const type = String(fd.get("type") ?? "connected_to");
  if (!toAssetId || toAssetId === fromAssetId) return;
  await db.insert(schema.assetRelationships).values({ fromAssetId, toAssetId, type });
  await logActivity(me, { action: "asset.relationship.add", category: "asset", targetType: "asset", targetId: fromAssetId, after: { toAssetId, type } });
  revalidatePath(`/assets/${fromAssetId}`);
}
export async function removeRelationship(id: number, assetId: number) {
  const me = await requireStaff();
  await db.delete(schema.assetRelationships).where(eq(schema.assetRelationships.id, id));
  await logActivity(me, { action: "asset.relationship.remove", category: "asset", targetType: "asset", targetId: assetId, before: { id } });
  revalidatePath(`/assets/${assetId}`);
}

// ---------- Workspaces ----------
export async function switchWorkspace(slug: string) {
  const me = await requirePrincipal();
  const allowed = me.role === "admin" ? true : (await db.select().from(schema.workspaceMembers).where(and(eq(schema.workspaceMembers.personId, me.id), eq(schema.workspaceMembers.workspace, slug))).limit(1)).length > 0;
  if (!allowed) return;
  (await cookies()).set("tf_workspace", slug, { path: "/", sameSite: "lax", maxAge: 60 * 60 * 24 * 365 });
  revalidatePath("/", "layout");
}
export async function addWorkspaceMember(workspace: string, fd: FormData) {
  const me = await requireStaff();
  const personId = Number(fd.get("personId"));
  if (!personId) return;
  await db.insert(schema.workspaceMembers).values({ workspace, personId, role: String(fd.get("role") ?? "agent") }).onConflictDoNothing();
  await logActivity(me, { action: "workspace.member.add", category: "settings", targetType: "workspace", targetId: workspace, after: { personId } });
  revalidatePath("/admin/workspaces");
}
export async function removeWorkspaceMember(workspace: string, personId: number) {
  const me = await requireStaff();
  await db.delete(schema.workspaceMembers).where(and(eq(schema.workspaceMembers.workspace, workspace), eq(schema.workspaceMembers.personId, personId)));
  await logActivity(me, { action: "workspace.member.remove", category: "settings", targetType: "workspace", targetId: workspace, before: { personId } });
  revalidatePath("/admin/workspaces");
}

// ---------- Custom fields ----------
export async function createField(fd: FormData) {
  const me = await requireStaff();
  const label = String(fd.get("label") ?? "").trim();
  if (!label) return;
  const key = label.toLowerCase().replace(/[^a-z0-9]+/g, "_").replace(/^_|_$/g, "");
  const options = String(fd.get("options") ?? "").split(",").map((s) => s.trim()).filter(Boolean);
  const [pos] = (await db.execute(sql`select coalesce(max(position),-1)+1 as n from custom_fields`)) as unknown as { n: number }[];
  await db.insert(schema.customFields).values({ entity: String(fd.get("entity") ?? "ticket"), key, label, type: String(fd.get("type") ?? "text"), options, required: fd.get("required") === "on", position: Number(pos?.n ?? 0), workspace: String(fd.get("workspace") ?? "") || null });
  await logActivity(me, { action: "field.create", category: "settings", targetType: "custom_field", targetId: key });
  revalidatePath("/admin/fields");
}
export async function deleteField(id: number) {
  const me = await requireStaff();
  await db.delete(schema.customFields).where(eq(schema.customFields.id, id));
  await logActivity(me, { action: "field.delete", category: "settings", targetType: "custom_field", targetId: id });
  revalidatePath("/admin/fields");
}
export async function saveTicketCustom(ticketId: number, fd: FormData) {
  const me = await requireStaff();
  const [t] = await db.select({ custom: schema.tickets.custom }).from(schema.tickets).where(eq(schema.tickets.id, ticketId)).limit(1);
  if (!t) return;
  const fields = await db.select().from(schema.customFields).where(eq(schema.customFields.entity, "ticket"));
  const custom: Record<string, string> = { ...t.custom };
  for (const f of fields) {
    const v = fd.get(`cf_${f.key}`);
    if (f.type === "toggle") custom[f.key] = v ? "Yes" : "No";
    else if (v !== null) custom[f.key] = String(v);
  }
  await db.update(schema.tickets).set({ custom, updatedAt: new Date() }).where(eq(schema.tickets.id, ticketId));
  await logActivity(me, { action: "ticket.custom.update", category: "ticket", targetType: "ticket", targetId: ticketId, before: t.custom, after: custom });
  revalidatePath(`/tickets/${ticketId}`);
}

// ---------- Notification preferences ----------
export async function saveNotifyPrefs(fd: FormData) {
  const me = await requirePrincipal();
  const kinds = ["assignment", "sla", "task", "mention", "approval", "change", "release", "reminder"];
  const notify: Record<string, { inApp: boolean; email: boolean; teams: boolean }> = {};
  for (const k of kinds) notify[k] = { inApp: fd.get(`${k}.inApp`) === "on", email: fd.get(`${k}.email`) === "on", teams: fd.get(`${k}.teams`) === "on" };
  await db.insert(schema.userPrefs).values({ personId: me.id, notify }).onConflictDoUpdate({ target: schema.userPrefs.personId, set: { notify, updatedAt: new Date() } });
  await logActivity(me, { action: "prefs.notify.update", category: "settings", targetType: "person", targetId: me.id, after: notify });
  revalidatePath("/notifications/preferences");
}

export async function goToWorkspaceHome() {
  redirect("/tickets");
}


// ---------- Saved views (Tickets list) ----------
export async function saveView(fd: FormData) {
  const me = await requireStaff();
  const name = String(fd.get("name") ?? "").trim();
  if (!name) return;
  let filter: unknown = {};
  try { filter = JSON.parse(String(fd.get("filter") ?? "{}")); } catch {}
  await db.insert(schema.savedViews).values({ ownerId: me.id, name, filter: filter as Record<string, unknown>, shared: fd.get("shared") === "on" });
  await logActivity(me, { action: "view.save", category: "settings", targetType: "saved_view", targetId: name, after: filter });
  revalidatePath("/tickets");
}
export async function deleteSavedView(id: number) {
  const me = await requireStaff();
  await db.delete(schema.savedViews).where(and(eq(schema.savedViews.id, id), sql`(${schema.savedViews.ownerId} = ${me.id} or ${schema.savedViews.shared} = false)`));
  await logActivity(me, { action: "view.delete", category: "settings", targetType: "saved_view", targetId: id });
  revalidatePath("/tickets");
}
