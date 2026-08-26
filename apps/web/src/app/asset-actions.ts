"use server";

import { db, schema } from "@ticketfly/db";
import { and, eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { requirePrincipal, requireStaff } from "@/lib/auth";
import { logActivity } from "@/lib/activity";

type Patch = Partial<Pick<typeof schema.assets.$inferInsert, "impact" | "status" | "usageType" | "lastSeenCity" | "department" | "ownerId" | "managedById" | "managedByGroupId" | "endOfLife" | "assignedOn">>;

export type AssetField = "impact" | "status" | "usageType" | "location" | "department" | "ownerId" | "managedById" | "managedByGroupId" | "endOfLife";
const ASSET_FIELDS: readonly AssetField[] = ["impact", "status", "usageType", "location", "department", "ownerId", "managedById", "managedByGroupId", "endOfLife"];

/** Inline edit of a single property on the asset page — same validation, logging and revalidation as the full update. */
export async function updateAssetField(assetId: number, field: AssetField, value: string) {
  if (!ASSET_FIELDS.includes(field)) return;
  const fd = new FormData();
  fd.set(field, value);
  await updateAsset(assetId, fd);
}

/** Property update on the asset page — every change logged with before/after. Only fields present in the form are touched. */
export async function updateAsset(assetId: number, formData: FormData) {
  const me = await requireStaff();
  const [a] = await db.select().from(schema.assets).where(eq(schema.assets.id, assetId)).limit(1);
  if (!a) return;
  const str = (k: string) => {
    const v = formData.get(k);
    return v === null ? undefined : String(v);
  };
  /** Absent key → untouched; empty string → cleared. */
  const strOrNull = (k: string) => {
    const v = str(k);
    return v === undefined ? undefined : v || null;
  };
  const num = (k: string) => {
    const v = str(k);
    return v === undefined ? undefined : v === "" ? null : Number(v);
  };
  const patch: Patch = {};
  const before: Record<string, unknown> = {};
  const after: Record<string, unknown> = {};
  const set = <K extends keyof Patch>(k: K, v: Patch[K]) => {
    if (v === undefined || v === a[k]) return;
    before[k] = a[k];
    after[k] = v;
    patch[k] = v;
  };
  set("impact", str("impact"));
  set("status", str("status") as Patch["status"]);
  set("usageType", str("usageType"));
  set("lastSeenCity", strOrNull("location"));
  set("department", strOrNull("department"));
  set("ownerId", num("ownerId"));
  set("managedById", num("managedById"));
  set("managedByGroupId", num("managedByGroupId"));
  set("endOfLife", strOrNull("endOfLife"));
  if (Object.keys(after).length === 0) return;
  // Re-assignment resets acknowledgement and writes assignment history.
  if ("ownerId" in after) {
    (patch as Record<string, unknown>).acknowledgedAt = null;
    (patch as Record<string, unknown>).returnedAt = null;
    (patch as Record<string, unknown>).assignedOn = after.ownerId ? new Date() : null;
    await db.update(schema.assetAssignments).set({ returnedAt: new Date() }).where(eq(schema.assetAssignments.assetId, assetId));
    if (after.ownerId) await db.insert(schema.assetAssignments).values({ assetId, personId: after.ownerId as number, assignedAt: new Date(), note: `Assigned by ${me.displayName}` });
  }
  await db.update(schema.assets).set({ ...patch, updatedAt: new Date() }).where(eq(schema.assets.id, assetId));
  await logActivity(me, { action: "ownerId" in after ? "asset.assign" : "asset.update", category: "asset", targetType: "asset", targetId: assetId, before, after });
  revalidatePath(`/assets/${assetId}`);
  revalidatePath("/assets/inventory");
}

export async function setSoftwareStatus(assetId: number, softwareId: number, status: "in_review" | "ignored" | "managed") {
  const me = await requireStaff();
  await db.update(schema.assetSoftware).set({ status }).where(and(eq(schema.assetSoftware.assetId, assetId), eq(schema.assetSoftware.softwareId, softwareId)));
  await logActivity(me, { action: "asset.software.status", category: "asset", targetType: "asset", targetId: assetId, after: { softwareId, status } });
  revalidatePath(`/assets/${assetId}`);
}

/** Requester portal: acknowledge receipt of a device assigned to me. */
export async function acknowledgeDevice(assetId: number) {
  const me = await requirePrincipal();
  const [a] = await db.select().from(schema.assets).where(eq(schema.assets.id, assetId)).limit(1);
  if (!a || a.ownerId !== me.id) return;
  const now = new Date();
  await db.update(schema.assets).set({ acknowledgedAt: now, updatedAt: now }).where(eq(schema.assets.id, assetId));
  await db.update(schema.assetAssignments).set({ acknowledgedAt: now }).where(eq(schema.assetAssignments.assetId, assetId));
  await logActivity(me, { action: "asset.acknowledge", category: "asset", targetType: "asset", targetId: assetId, after: { acknowledgedAt: now.toISOString() } });
  revalidatePath("/portal/devices");
  revalidatePath(`/assets/${assetId}`);
}

/** Requester portal: I no longer have this device — flags it for IT to unassign. */
export async function reportReturned(assetId: number) {
  const me = await requirePrincipal();
  const [a] = await db.select().from(schema.assets).where(eq(schema.assets.id, assetId)).limit(1);
  if (!a || a.ownerId !== me.id) return;
  const now = new Date();
  await db.update(schema.assets).set({ returnedAt: now, updatedAt: now }).where(eq(schema.assets.id, assetId));
  await logActivity(me, { action: "asset.returned.reported", category: "asset", targetType: "asset", targetId: assetId, after: { returnedAt: now.toISOString() } });
  revalidatePath("/portal/devices");
  revalidatePath(`/assets/${assetId}`);
  revalidatePath("/assets/inventory");
}
