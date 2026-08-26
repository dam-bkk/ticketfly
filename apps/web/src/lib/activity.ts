import "server-only";
import { db, schema } from "@ticketfly/db";
import { APP_VERSION, requestMeta, type Principal } from "./auth";

/** Every write in the app goes through here. Append-only by convention and by DB grants in prod. */
export async function logActivity(
  actor: Principal | null,
  entry: {
    action: string;
    category: "ticket" | "asset" | "person" | "access" | "workflow" | "settings" | "auth" | "integration" | "system";
    targetType?: string;
    targetId?: string | number;
    before?: unknown;
    after?: unknown;
  },
) {
  const meta = await requestMeta();
  await db.insert(schema.activityLog).values({
    actorId: actor?.id ?? null,
    actorName: actor?.displayName ?? "system",
    actorType: actor ? "user" : "system",
    action: entry.action,
    category: entry.category,
    targetType: entry.targetType,
    targetId: entry.targetId === undefined ? null : String(entry.targetId),
    before: entry.before ?? null,
    after: entry.after ?? null,
    ip: meta.ip,
    userAgent: meta.userAgent,
    requestId: meta.requestId,
    release: APP_VERSION,
  });
}
