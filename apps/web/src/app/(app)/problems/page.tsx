import Link from "next/link";
import { Plus } from "lucide-react";
import { requireStaff } from "@/lib/auth";
import { listProblems } from "@/lib/modules";
import { cn, relTime } from "@/lib/utils";
import { Topbar } from "@/components/shell/topbar";
import { Avatar } from "@/components/ui/avatar";
import { ButtonLink } from "@/components/ui/button";
import { Empty } from "@/components/ui/empty";
import { PriorityMark, Tone } from "@/components/ui/pills";
import { PROBLEM_STATUS_LABEL, RISK_TONE } from "@/components/ui/record";

export const metadata = { title: "Problems" };

const TABS: [string, string][] = [["", "All open"], ["open", "Open"], ["known_error", "Known errors"], ["resolved", "Resolved"], ["closed", "Closed"]];

export default async function ProblemsPage({ searchParams }: { searchParams: Promise<{ status?: string }> }) {
  await requireStaff();
  const { status = "" } = await searchParams;
  const all = await listProblems(status || undefined);
  const rows = status ? all : all.filter((r) => r.p.status === "open" || r.p.status === "known_error");
  const knownErrors = all.filter((r) => r.p.status === "known_error").length;
  return (
    <>
      <Topbar
        crumbs={[{ label: "Problems" }]}
        actions={
          <ButtonLink href="/problems/new" variant="secondary">
            <Plus className="size-3.5" /> New Problem
          </ButtonLink>
        }
      />
      <div className="flex h-11 shrink-0 items-center gap-1 bg-surface px-3 hairline-b">
        {TABS.map(([k, label]) => (
          <Link key={k} href={`/problems${k ? `?status=${k}` : ""}`} className={cn("h-7 rounded-md px-2.5 text-[12.5px] font-medium leading-7 text-ink-2 hover:bg-surface-2 hover:text-ink", status === k && "bg-surface-2 text-ink")}>
            {label}
          </Link>
        ))}
        <span className="ml-auto text-[12px] text-ink-3">{knownErrors} known error{knownErrors === 1 ? "" : "s"} with a workaround agents can paste into replies</span>
      </div>
      <div className="flex-1 overflow-y-auto">
        {rows.length === 0 ? (
          <Empty title="No problems here" hint="Raise one from a ticket when three or more incidents share a cause." action={<ButtonLink href="/problems/new">New Problem</ButtonLink>} />
        ) : (
          <table className="w-full text-[13px]">
            <thead className="sticky top-0 bg-surface-2">
              <tr className="text-left [&>th]:h-9 [&>th]:px-4">
                <th className="label w-8" />
                <th className="label">Problem</th>
                <th className="label">Status</th>
                <th className="label">Impact</th>
                <th className="label text-right">Incidents</th>
                <th className="label">Team</th>
                <th className="label">Assignee</th>
                <th className="label text-right">Updated</th>
              </tr>
            </thead>
            <tbody>
              {rows.map(({ p, assignee, group, category, incidents, openTasks }) => (
                <tr key={p.id} className="row hairline-b">
                  <td className="px-4 py-2.5">
                    <PriorityMark priority={p.priority} />
                  </td>
                  <td className="px-4 py-2.5">
                    <Link href={`/problems/${p.id}`} className="block font-medium text-accent-ink hover:underline">
                      {p.title}
                    </Link>
                    <span className="text-[11.5px] text-ink-3">
                      <span className="font-mono">PRB-{p.id}</span> · {category ?? "Uncategorised"}
                      {p.workaround ? " · workaround available" : ""}
                      {openTasks ? ` · ${openTasks} open task${openTasks > 1 ? "s" : ""}` : ""}
                    </span>
                  </td>
                  <td className="px-4 py-2.5">
                    <Tone tone={p.status === "known_error" ? "warn" : p.status === "open" ? "info" : "neutral"}>{PROBLEM_STATUS_LABEL[p.status]}</Tone>
                  </td>
                  <td className="px-4 py-2.5">
                    <Tone tone={(RISK_TONE[p.impact] ?? "neutral")} className="capitalize">{p.impact}</Tone>
                  </td>
                  <td className="tnum px-4 py-2.5 text-right font-medium">{incidents}</td>
                  <td className="px-4 py-2.5 text-ink-2">{group ?? "—"}</td>
                  <td className="px-4 py-2.5">{assignee ? <span className="flex items-center gap-2"><Avatar name={assignee} size={20} />{assignee}</span> : <span className="text-ink-4">Unassigned</span>}</td>
                  <td className="tnum px-4 py-2.5 text-right text-ink-3">{relTime(p.updatedAt)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </>
  );
}
