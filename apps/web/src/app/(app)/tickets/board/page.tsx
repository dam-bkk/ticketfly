import Link from "next/link";
import { requireStaff } from "@/lib/auth";
import { listInbox } from "@/lib/queries";
import { workspaceContext } from "@/lib/workspace";
import { cn, relTime, STATUS_SHORT } from "@/lib/utils";
import { Topbar } from "@/components/shell/topbar";
import { Avatar } from "@/components/ui/avatar";
import { PriorityMark, StatusDot } from "@/components/ui/pills";
import { Clock } from "lucide-react";

export const metadata = { title: "Ticket board" };

const COLUMNS = ["open", "in_progress", "pending", "pending_approval", "on_hold", "resolved", "cancelled", "closed", "transferred"] as const;

export default async function BoardPage() {
  const me = await requireStaff();
  const { current } = await workspaceContext(me);
  const rows = await listInbox({ filter: "open", meId: me.id, limit: 400, workspace: current.slug });
  const done = await listInbox({ filter: "resolved", meId: me.id, limit: 60, workspace: current.slug });
  const all = [...rows, ...done];
  return (
    <>
      <Topbar crumbs={[{ label: "Tickets", href: "/tickets" }, { label: "Board" }]} />
      <div className="flex h-10 shrink-0 items-center gap-1 bg-surface px-3 hairline-b">
        <Link href="/tickets" className="h-7 rounded-md px-2.5 text-[12.5px] font-medium leading-7 text-ink-2 hover:bg-surface-2 hover:text-ink">
          List
        </Link>
        <span className="h-7 rounded-md bg-surface-2 px-2.5 text-[12.5px] font-medium leading-7 text-ink">Board</span>
        <span className="ml-3 text-[12px] text-ink-3">My Board · sorted by date created · same columns as today</span>
      </div>
      <div className="flex-1 overflow-x-auto overflow-y-hidden">
        <div className="flex h-full min-w-max gap-3 p-4">
          {COLUMNS.map((status) => {
            const cards = all.filter((t) => t.status === status);
            return (
              <section key={status} className="flex h-full w-[300px] shrink-0 flex-col rounded-xl bg-surface-2/60">
                <header className="flex items-center gap-2 px-3 py-2.5">
                  <StatusDot status={status} />
                  <span className="text-[13px] font-medium">{STATUS_SHORT[status]}</span>
                  <span className="tnum ml-auto text-[12px] text-ink-3">{cards.length}</span>
                </header>
                <div className="min-h-0 flex-1 space-y-2 overflow-y-auto px-2 pb-2">
                  {cards.map((t) => (
                    <Link key={t.id} href={`/tickets/${t.id}`} className={cn("block rounded-lg bg-surface p-3 transition-shadow hairline hover:shadow-2")}>
                      <div className="flex items-center gap-2 text-[11px] text-ink-3">
                        <span className="font-mono">#{t.ref}</span>
                        <span className={cn("ml-auto flex items-center gap-1", t.sla.status === "breached" && !["resolved", "closed", "cancelled"].includes(status) ? "text-crit" : "")}>
                          <Clock className="size-3" />
                          {["resolved", "closed"].includes(status) ? (t.sla.status === "breached" ? "Resolved late" : "Resolved on time") : status === "cancelled" ? `Cancelled ${relTime(t.updatedAt)}` : t.sla.status === "breached" ? `Overdue by ${t.sla.label.replace(" over", "")}` : t.sla.status === "paused" ? `${STATUS_SHORT[status]} for ${relTime(t.updatedAt).replace(" ago", "")}` : `Due in ${t.sla.label.replace(" left", "")}`}
                        </span>
                      </div>
                      <p className="mt-1.5 text-[13px] font-medium leading-snug">{t.subject}</p>
                      <div className="mt-2 flex flex-wrap items-center gap-1.5 text-[11px]">
                        {t.requesterResponded && !["resolved", "closed", "cancelled"].includes(status) && <span className="rounded bg-accent-soft px-1.5 py-0.5 font-medium text-accent-ink">Requester responded</span>}
                        {t.tags.includes("intelliflow") && <span className="rounded bg-surface-2 px-1.5 py-0.5 text-ink-3">Automation</span>}
                        {t.sla.status === "breached" && !["resolved", "closed", "cancelled"].includes(status) && <span className="rounded bg-crit-soft px-1.5 py-0.5 font-medium text-crit">Overdue</span>}
                      </div>
                      <div className="mt-2 flex items-center gap-2 text-[11.5px]">
                        <PriorityMark priority={t.priority} withLabel className="rounded bg-surface-2 px-1.5 py-0.5 text-[11px]" />
                        <span className="rounded bg-surface-2 px-1.5 py-0.5 text-ink-2">{STATUS_SHORT[status]}</span>
                        <span className="ml-auto">{t.assignee ? <Avatar name={t.assignee} size={18} /> : <span className="inline-block size-[18px] rounded-full border border-dashed border-line-strong" />}</span>
                      </div>
                    </Link>
                  ))}
                  {cards.length === 0 && <p className="px-2 py-6 text-center text-[12px] text-ink-4">Nothing here</p>}
                </div>
              </section>
            );
          })}
        </div>
      </div>
    </>
  );
}
