import { redirect } from "next/navigation";
export default async function Old({ searchParams }: { searchParams: Promise<Record<string, string>> }) {
  const sp = await searchParams;
  redirect(`/tickets${sp.f ? `?f=${sp.f}` : ""}`);
}
