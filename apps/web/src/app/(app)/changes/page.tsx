import Link from "next/link";
import { CalendarDays, Plus } from "lucide-react";
import { format } from "date-fns";
import { requireStaff } from "@/lib/auth";
import { changeCounts, listChanges } from "@/lib/modules";
import { cn, relTime } from "@/lib/utils";
import { Topbar } from "@/components/shell/topbar";
import { Avatar } from "@/components/ui/avatar";
import { ButtonLink } from "@/components/ui/button";
import { Empty } from "@/components/ui/empty";
import { Tone } from "@/components/ui/pills";
import { CHANGE_STATUS_LABEL, RISK_TONE } from "@/components/ui/record";

export const metadata = { title: "Changes" };

const STATUS_TONE: Record<string, "ok" | "warn" | "crit" | "info" | "neutral" | "violet"> = { open: "neutral", planning: "neutral", awaiting_approval: "warn", approved: "info", in_progress: "violet", completed: "ok", rolled_back: "crit", closed: "neutral" };

export default async function ChangesPage({ searchParams }: { searchParams: Promise<{ f?: string }> }) {
  const me = await requireStaff();
  const { f = "open" } = await searchParams;
  const [rows, k] = await Promise.all([listChanges(f), changeCounts()]);
  const mine = rows.filter((r) => r.c.approvals.some((a) => a.personId === me.id && a.decision === "pending"));
  const TABS: [string, string, number | undefined][] = [["open", "Open", k.open], ["approval", "Awaiting approval", k.approval], ["scheduled", "Scheduled", k.scheduled], ["closed", "Closed", undefined], ["all", "All", undefined]];
  return (
    <>
      <Topbar
        crumbs={[{ label: "Changes" }]}
        actions={
          <>
            <ButtonLink href="/changes/calendar" variant="ghost">
              <CalendarDays className="size-3.5" /> Calendar
            </ButtonLink>
            <ButtonLink href="/changes/new" variant="secondary">
              <Plus className="size-3.5" /> New Change
            </ButtonLink>
          </>
        }
      />
      <div className="flex h-11 shrink-0 items-center gap-1 bg-surface px-3 hairline-b">
        {TABS.map(([key, label, n]) => (
          <Link key={key} href={`/changes?f=${key}`} className={cn("flex h-7 items-center gap-1.5 rounded-md px-2.5 text-[12.5px] font-medium text-ink-2 hover:bg-surface-2 hover:text-ink", f === key && "bg-surface-2 text-ink")}>
            {label}
            {n !== undefined && <span className={cn("tnum text-[11px]", key === "approval" && n ? "text-warn" : "text-ink-3")}>{n}</span>}
          </Link>
        ))}
        <span className="ml-auto text-[12px] text-ink-3">{k.thisWeek} planned in the next 7 days</span>
      </div>
      <div className="flex-1 overflow-y-auto">
        {mine.length > 0 && (
          <div className="mx-4 mt-3 rounded-lg bg-warn-soft px-4 py-2.5 text-[13px] text-warn">
            <strong className="font-medium">{mine.length} change{mine.length > 1 ? "s" : ""} waiting for your approval.</strong> Open it, read the plan, approve or reject — two clicks.
          </div>
        )}
        {rows.length === 0 ? (
          <Empty title="No changes in this view" />
        ) : (
          <table className="w-full text-[13px]">
            <thead className="sticky top-0 bg-surface-2">
              <tr className="text-left [&>th]:h-9 [&>th]:px-4">
                <th className="label">Change</th>
                <th className="label">Type</th>
                <th className="label">Status</th>
                <th className="label">Risk</th>
                <th className="label">Planned</th>
                <th className="label">Assignee</th>
                <th className="label">Approvals</th>
                <th className="label text-right">Updated</th>
              </tr>
            </thead>
            <tbody>
              {rows.map(({ c, assignee, group, release, openTasks }) => (
                <tr key={c.id} className="row hairline-b">
                  <td className="px-4 py-2.5">
                    <Link href={`/changes/${c.id}`} className="block font-medium text-accent-ink hover:underline">
                      {c.title}
                    </Link>
                    <span className="text-[11.5px] text-ink-3">
                      <span className="font-mono">CHG-{c.id}</span> · {group ?? "—"}
                      {release ? ` · ${release}` : ""}
                      {openTasks ? ` · ${openTasks} open task${openTasks > 1 ? "s" : ""}` : ""}
                    </span>
                  </td>
                  <td className="px-4 py-2.5 capitalize text-ink-2">{c.type}</td>
                  <td className="px-4 py-2.5">
                    <Tone tone={STATUS_TONE[c.status] ?? "neutral"}>{CHANGE_STATUS_LABEL[c.status]}</Tone>
                  </td>
                  <td className="px-4 py-2.5">
                    <Tone tone={(RISK_TONE[c.risk] ?? "neutral")} className="capitalize">{c.risk}</Tone>
                  </td>
                  <td className="tnum px-4 py-2.5 text-ink-2">{c.plannedStart ? format(c.plannedStart, "EEE d MMM, HH:mm") : "—"}</td>
                  <td className="px-4 py-2.5">{assignee ? <span className="flex items-center gap-2"><Avatar name={assignee} size={20} />{assignee}</span> : "—"}</td>
                  <td className="px-4 py-2.5">
                    {c.approvals.length === 0 ? <span className="text-ink-3">{c.type === "standard" ? "Pre-approved" : "—"}</span> : (
                      <span className="flex items-center gap-1">
                        {c.approvals.map((a) => (
                          <span key={a.personId} title={`${a.name}: ${a.decision}`} className={cn("size-2 rounded-full", a.decision === "approved" ? "bg-ok" : a.decision === "rejected" ? "bg-crit" : "bg-warn")} />
                        ))}
                        <span className="ml-1 text-[11.5px] text-ink-3">{c.approvals.filter((a) => a.decision === "approved").length}/{c.approvals.length}</span>
                      </span>
                    )}
                  </td>
                  <td className="tnum px-4 py-2.5 text-right text-ink-3">{relTime(c.updatedAt)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </>
  );
}
