import Link from "next/link";
import { Plus } from "lucide-react";
import { formatTicketRef } from "@ticketfly/core";
import { requireStaff } from "@/lib/auth";
import { inboxCounts, listInbox, type InboxFilter } from "@/lib/queries";
import { cn, relTime } from "@/lib/utils";
import { Topbar } from "@/components/shell/topbar";
import { Avatar } from "@/components/ui/avatar";
import { ButtonLink } from "@/components/ui/button";
import { Empty } from "@/components/ui/empty";
import { PriorityMark, SlaChip, StatusPill, Tag } from "@/components/ui/pills";
import { InboxSearch } from "./search";

export const metadata = { title: "Inbox" };

const TABS: { key: InboxFilter; label: string }[] = [
  { key: "open", label: "All open" },
  { key: "mine", label: "Mine" },
  { key: "unassigned", label: "Unassigned" },
  { key: "at_risk", label: "At risk" },
  { key: "waiting", label: "Waiting" },
  { key: "resolved", label: "Recently resolved" },
  { key: "legacy", label: "Freshservice archive" },
];

export default async function InboxPage({ searchParams }: { searchParams: Promise<{ f?: string; q?: string }> }) {
  const me = await requireStaff();
  const sp = await searchParams;
  const filter = (TABS.some((t) => t.key === sp.f) ? sp.f : "open") as InboxFilter;
  const [rows, counts] = await Promise.all([listInbox({ filter, meId: me.id, q: sp.q }), inboxCounts(me.id)]);
  const countFor: Partial<Record<InboxFilter, number>> = { open: counts.open, mine: counts.mine, unassigned: counts.unassigned, at_risk: counts.atRisk, waiting: counts.waiting, legacy: counts.legacy };

  return (
    <>
      <Topbar
        crumbs={[{ label: "Inbox" }]}
        actions={
          <ButtonLink href="/portal/new/report-issue" variant="primary" size="md">
            <Plus className="size-3.5" /> New ticket
          </ButtonLink>
        }
      />
      <div className="flex h-11 shrink-0 items-center gap-1 bg-surface px-3 hairline-b">
        {TABS.map((t) => (
          <Link key={t.key} href={`/inbox?f=${t.key}${sp.q ? `&q=${encodeURIComponent(sp.q)}` : ""}`} className={cn("flex h-7 items-center gap-1.5 rounded-md px-2.5 text-[12.5px] font-medium text-ink-2 transition-colors hover:bg-surface-2 hover:text-ink", filter === t.key && "bg-surface-2 text-ink")}>
            {t.label}
            {countFor[t.key] !== undefined && <span className={cn("tnum text-[11px]", t.key === "at_risk" && countFor[t.key] ? "text-warn" : "text-ink-3")}>{countFor[t.key]}</span>}
          </Link>
        ))}
        <div className="ml-auto">
          <InboxSearch filter={filter} q={sp.q ?? ""} />
        </div>
      </div>
      <div className="flex-1 overflow-y-auto">
        {rows.length === 0 ? (
          <Empty title={sp.q ? `Nothing matches “${sp.q}”` : "Queue is clear"} hint={sp.q ? "Try an old Freshservice reference like INC-4210, or a word from the subject." : "New tickets from the portal and email land here."} />
        ) : (
          <ul className="rise">
            {rows.map((t) => (
              <li key={t.id} className="row hairline-b">
                <Link href={`/tickets/${t.id}`} className="grid grid-cols-[20px_minmax(0,1fr)_150px_120px_112px_40px_88px] items-center gap-3 px-5 py-2.5">
                  <PriorityMark priority={t.priority} />
                  <span className="min-w-0">
                    <span className="flex items-center gap-2">
                      <span className="truncate text-[13.5px] font-medium text-ink">{t.subject}</span>
                      {t.tags.map((tag) => (
                        <Tag key={tag}>{tag}</Tag>
                      ))}
                    </span>
                    <span className="mt-0.5 flex items-center gap-1.5 text-[12px] text-ink-3">
                      <span className="font-mono text-[11px]">{t.legacyRef ?? formatTicketRef(t.id)}</span>
                      <span aria-hidden>·</span>
                      <span className="truncate">{t.requester}</span>
                      {t.requesterDept && <span className="truncate text-ink-4">{t.requesterDept}</span>}
                      {t.messageCount > 0 && (
                        <>
                          <span aria-hidden>·</span>
                          <span className="tnum">{t.messageCount} {t.messageCount === 1 ? "message" : "messages"}</span>
                        </>
                      )}
                    </span>
                  </span>
                  <StatusPill status={t.status} />
                  <span>{t.status === "closed" || t.status === "resolved" ? <span className="text-[12px] text-ink-4">{t.sla.status === "met" ? "SLA met" : t.sla.status === "breached" ? "SLA breached" : ""}</span> : <SlaChip sla={t.sla} compact />}</span>
                  <span className="truncate text-[12px] text-ink-3">{t.groupName ?? "—"}</span>
                  <span className="flex justify-center">{t.assignee ? <Avatar name={t.assignee} size={22} /> : <span className="inline-block size-[22px] rounded-full border border-dashed border-line-strong" title="Unassigned" />}</span>
                  <span className="tnum text-right text-[12px] text-ink-3">{relTime(t.updatedAt)}</span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </div>
    </>
  );
}
