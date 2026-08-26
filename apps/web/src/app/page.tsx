import { redirect } from "next/navigation";
import { getPrincipal } from "@/lib/auth";

export default async function Home() {
  const me = await getPrincipal();
  if (!me) redirect("/login");
  redirect(me.role === "requester" || me.role === "manager" ? "/portal" : "/inbox");
}
