import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { requirePrincipal } from "@/lib/auth";
import { myRequests } from "@/lib/queries";
import { relTime, STATUS_LABEL } from "@/lib/utils";
import { StatusDot } from "@/components/ui/pills";

export const metadata = { title: "My requests" };

export default async function MyRequests() {
  const me = await requirePrincipal();
  const rows = await myRequests(me.id);
  const open = rows.filter((r) => r.status !== "closed" && r.status !== "resolved");
  const done = rows.filter((r) => r.status === "closed" || r.status === "resolved");
  return (
    <div className="pt-10 rise">
      <h1 className="text-[26px] font-semibold tracking-[-0.015em]">My requests</h1>
      <p className="text-[14px] text-ink-3">Everything you have asked IT for, newest first.</p>
      <Group title="In progress" rows={open} empty="Nothing in progress." />
      <Group title="Done" rows={done} empty="No completed requests yet." />
    </div>
  );
}

function Group({ title, rows, empty }: { title: string; rows: Awaited<ReturnType<typeof myRequests>>; empty: string }) {
  return (
    <section className="mt-8">
      <h2 className="mb-3 text-[13px] font-medium text-ink-3">
        {title} <span className="tnum">· {rows.length}</span>
      </h2>
      {rows.length === 0 ? (
        <p className="rounded-xl bg-surface p-5 text-[13.5px] text-ink-3 hairline">{empty}</p>
      ) : (
        <ul className="divide-y divide-line rounded-xl bg-surface hairline">
          {rows.map((r) => (
            <li key={r.id}>
              <Link href={`/portal/requests/${r.id}`} className="row flex items-center gap-4 px-5 py-3.5 first:rounded-t-xl last:rounded-b-xl">
                <StatusDot status={r.status} className="size-2" />
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-[14px] font-medium">{r.subject}</span>
                  <span className="block text-[12.5px] text-ink-3">
                    {STATUS_LABEL[r.status]}
                    {r.assignee ? ` · ${r.assignee}` : ""} · {r.ref}
                  </span>
                </span>
                <span className="text-[12px] text-ink-4">{relTime(r.updatedAt)}</span>
                <ArrowRight className="size-4 text-ink-4" />
              </Link>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
