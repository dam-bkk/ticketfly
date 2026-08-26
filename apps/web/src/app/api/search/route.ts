import { NextResponse } from "next/server";
import { getPrincipal } from "@/lib/auth";
import { globalSearch } from "@/lib/queries";

export async function GET(req: Request) {
  const me = await getPrincipal();
  if (!me) return NextResponse.json({ error: "unauthenticated" }, { status: 401 });
  const q = new URL(req.url).searchParams.get("q") ?? "";
  const res = await globalSearch(q);
  // Requesters only see their own tickets through search.
  if (me.role === "requester" || me.role === "manager") {
    return NextResponse.json({ tickets: res.tickets.filter((t) => t.requester === me.displayName), people: [], assets: [] });
  }
  return NextResponse.json(res);
}
