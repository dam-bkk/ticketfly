"use server";

import { ackAlert } from "@/app/module-actions";

/** Page-level action: acknowledge every alert still in "new". Each one goes through the same per-alert action (and activity log entry). */
export async function ackAllNew(ids: number[]) {
  for (const id of ids) await ackAlert(id);
}
