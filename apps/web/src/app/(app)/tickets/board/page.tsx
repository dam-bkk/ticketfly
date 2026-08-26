import Link from "next/link";
import { requireStaff } from "@/lib/auth";
import { listInbox } from "@/lib/queries";
import { workspaceContext } from "@/lib/workspace";
import { relTime, STATUS_SHORT } from "@/lib/utils";
import { Topbar } from "@/components/shell/topbar";
import { Avatar } from "@/components/ui/avatar";
import { PriorityMark, SlaChip, StatusDot } from "@/components/ui/pills";

export const metadata = { title: "Ticket board" };

const COLUMNS = ["open", "in_progress", "pending", "pending_approval", "on_hold", "resolved", "cancelled", "closed", "transferred"] as const;
const CLOSED = new Set(["resolved", "closed", "cancelled"]);

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
        <span className="ml-3 text-[12.5px] text-ink-3">My Board · sorted by date created · same columns as today</span>
      </div>
      {/* Horizontal scroller with a right-edge fade so the cut-off column reads as "more to the right".
          `relative` matters: without it Chromium leaks the scroller's overflow into the document's scrollWidth. */}
      <div className="relative min-h-0 flex-1 overflow-x-auto overflow-y-hidden [mask-image:linear-gradient(to_right,#000_92%,transparent)]">
        <div className="flex h-full min-w-max gap-3 p-4 pr-16">
          {COLUMNS.map((status) => {
            const cards = all.filter((t) => t.status === status);
            const closed = CLOSED.has(status);
            return (
              <section key={status} aria-label={STATUS_SHORT[status]} className="flex h-full w-[300px] shrink-0 flex-col rounded-xl bg-surface-2/60">
                <header className="flex items-center gap-2 px-3 py-2.5">
                  <StatusDot status={status} />
                  <span className="text-[13.5px] font-medium">{STATUS_SHORT[status]}</span>
                  <span className="tnum ml-auto text-[12.5px] text-ink-3">{cards.length}</span>
                </header>
                <div className="min-h-0 flex-1 space-y-2 overflow-y-auto px-2 pb-2">
                  {cards.map((t) => (
                    <Link key={t.id} href={`/tickets/${t.id}`} className="block rounded-lg bg-surface p-3 transition-shadow hairline hover:shadow-2">
                      <div className="flex items-center gap-2 text-[11px] text-ink-3">
                        <span className="font-mono">#{t.ref}</span>
                        {/* One SLA signal per card: the chip. Column heading already says the status. */}
                        <span className="ml-auto">
                          {status === "cancelled" ? (
                            <span className="text-[11px]">Cancelled {relTime(t.updatedAt)}</span>
                          ) : closed ? (
                            <span className={t.sla.status === "breached" ? "text-[11px]" : "text-[11px] text-ok"}>{t.sla.status === "breached" ? "Resolved late" : "Resolved on time"}</span>
                          ) : (
                            <SlaChip sla={t.sla} compact className="h-5 px-1.5 text-[11px]" />
                          )}
                        </span>
                      </div>
                      <p className="mt-1.5 text-[13.5px] font-medium leading-snug text-ink">{t.subject}</p>
                      {(t.requesterResponded && !closed) || t.tags.includes("intelliflow") ? (
                        <div className="mt-2 flex flex-wrap items-center gap-1.5 text-[11px]">
                          {t.requesterResponded && !closed && <span className="rounded bg-accent-soft px-1.5 py-0.5 font-medium text-accent-ink">Requester responded</span>}
                          {t.tags.includes("intelliflow") && <span className="rounded bg-surface-2 px-1.5 py-0.5 text-ink-3">Automation</span>}
                        </div>
                      ) : null}
                      <div className="mt-2 flex items-center gap-2 text-[11px]">
                        <PriorityMark priority={t.priority} withLabel className="rounded bg-surface-2 px-1.5 py-0.5 [&>span:nth-child(2)]:text-[11px]" />
                        <span className="truncate text-ink-3">{t.requester}</span>
                        <span className="ml-auto shrink-0">{t.assignee ? <Avatar name={t.assignee} size={18} /> : <span className="inline-block size-[18px] rounded-full border border-dashed border-line-strong" title="Unassigned" />}</span>
                      </div>
                    </Link>
                  ))}
                  {cards.length === 0 && <p className="px-2 py-6 text-center text-[12.5px] text-ink-3">Nothing here</p>}
                </div>
              </section>
            );
          })}
        </div>
      </div>
    </>
  );
}
