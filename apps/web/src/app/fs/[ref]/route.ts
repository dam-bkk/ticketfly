import { NextResponse } from "next/server";
import { parseLegacyRef } from "@ticketfly/core";
import { getPrincipal } from "@/lib/auth";
import { getTicketByLegacyRef } from "@/lib/queries";

/** Permanent bridge for old Freshservice links and email subject tags: /fs/INC-4210 → /tickets/123 */
export async function GET(req: Request, { params }: { params: Promise<{ ref: string }> }) {
  const { ref } = await params;
  const parsed = parseLegacyRef(ref);
  // Behind Caddy / Cloudflare / Container Apps the internal URL is 0.0.0.0:3000 — rebuild the public origin from forwarded headers.
  const host = req.headers.get("x-forwarded-host") ?? req.headers.get("host") ?? "localhost:3000";
  const proto = req.headers.get("x-forwarded-proto") ?? (host.startsWith("localhost") ? "http" : "https");
  const url = new URL(`${proto}://${host}${new URL(req.url).pathname}`);
  if (!parsed) return NextResponse.redirect(new URL(`/search?q=${encodeURIComponent(ref)}`, url), 302);
  const t = await getTicketByLegacyRef(parsed.ref);
  if (!t) return NextResponse.redirect(new URL(`/search?q=${encodeURIComponent(parsed.ref)}`, url), 302);
  const me = await getPrincipal();
  const staff = me && me.role !== "requester" && me.role !== "manager";
  return NextResponse.redirect(new URL(staff ? `/tickets/${t.id}` : `/portal/requests/${t.id}`, url), 301);
}
