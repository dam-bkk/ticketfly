import { NextResponse } from "next/server";
import { parseLegacyRef } from "@ticketfly/core";
import { getPrincipal } from "@/lib/auth";
import { getTicketByLegacyRef } from "@/lib/queries";

/** Permanent bridge for old Freshservice links and email subject tags: /fs/INC-4210 → /tickets/123 */
export async function GET(req: Request, { params }: { params: Promise<{ ref: string }> }) {
  const { ref } = await params;
  const parsed = parseLegacyRef(ref);
  const url = new URL(req.url);
  if (!parsed) return NextResponse.redirect(new URL(`/search?q=${encodeURIComponent(ref)}`, url), 302);
  const t = await getTicketByLegacyRef(parsed.ref);
  if (!t) return NextResponse.redirect(new URL(`/search?q=${encodeURIComponent(parsed.ref)}`, url), 302);
  const me = await getPrincipal();
  const staff = me && me.role !== "requester" && me.role !== "manager";
  return NextResponse.redirect(new URL(staff ? `/tickets/${t.id}` : `/portal/requests/${t.id}`, url), 301);
}
