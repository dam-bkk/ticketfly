import Link from "next/link";
import { requireStaff } from "@/lib/auth";
import { inboxCounts, listInbox, type InboxFilter } from "@/lib/queries";
import { workspaceContext } from "@/lib/workspace";
import { cn, relTime } from "@/lib/utils";
import { Topbar } from "@/components/shell/topbar";
import { Avatar } from "@/components/ui/avatar";
import { ButtonLink } from "@/components/ui/button";
import { Empty } from "@/components/ui/empty";
import { PriorityMark, SlaChip, StatusPill, Tag } from "@/components/ui/pills";
import { InboxSearch } from "./search";
import { FilterPane, type ListFilter, type SavedView } from "./filter-pane";
import { listAgents, listGroups } from "@/lib/queries";
import { db, schema } from "@ticketfly/db";
import { asc, or, eq, isNotNull } from "drizzle-orm";
import { format } from "date-fns";

export const metadata = { title: "Tickets" };

const TABS: { key: InboxFilter; label: string }[] = [
  { key: "open", label: "All open" },
  { key: "mine", label: "Mine" },
  { key: "unassigned", label: "Unassigned" },
  { key: "at_risk", label: "At risk" },
  { key: "waiting", label: "Waiting" },
  { key: "approval", label: "Pending approval" },
  { key: "resolved", label: "Recently resolved" },
  { key: "legacy", label: "Freshservice archive" },
];

export default async function InboxPage({ searchParams }: { searchParams: Promise<ListFilter> }) {
  const me = await requireStaff();
  const sp = await searchParams;
  const filter = (TABS.some((t) => t.key === sp.f) ? sp.f : "open") as InboxFilter;
  const { current } = await workspaceContext(me);
  const adv = { group: sp.group, agent: sp.agent, status: sp.status, requester: sp.requester, department: sp.department, created: sp.created, due: sp.due, fr: sp.fr, priority: sp.priority, source: sp.source };
  const [rows, counts, groups, agents, views, deptRows] = await Promise.all([
    listInbox({ filter, meId: me.id, q: sp.q, workspace: current.slug, adv }),
    inboxCounts(me.id, current.slug),
    listGroups(),
    listAgents(),
    db.select().from(schema.savedViews).where(or(eq(schema.savedViews.ownerId, me.id), eq(schema.savedViews.shared, true))).orderBy(asc(schema.savedViews.name)),
    db.selectDistinct({ d: schema.people.department }).from(schema.people).where(isNotNull(schema.people.department)).orderBy(asc(schema.people.department)),
  ]);
  const savedViews: SavedView[] = views.map((v) => ({ id: v.id, name: v.name, shared: v.shared, ownerId: v.ownerId, filter: v.filter as ListFilter }));
  const activeView = savedViews.find((v) => String(v.id) === sp.view);
  const countFor: Partial<Record<InboxFilter, number>> = { open: counts.open, mine: counts.mine, unassigned: counts.unassigned, at_risk: counts.atRisk, waiting: counts.waiting, approval: counts.approval, legacy: counts.legacy };

  return (
    <>
      <Topbar
        crumbs={[{ label: "Tickets List" }, { label: activeView ? activeView.name : "All open" }]}
        actions={
          <ButtonLink href="/tickets/board" variant="secondary" size="md">
            Board view
          </ButtonLink>
        }
      />
      <div className="flex h-11 shrink-0 items-center gap-1 bg-surface px-3 hairline-b">
        {TABS.map((t) => (
          <Link key={t.key} href={`/tickets?f=${t.key}${sp.q ? `&q=${encodeURIComponent(sp.q)}` : ""}`} className={cn("flex h-7 items-center gap-1.5 rounded-md px-2.5 text-[12.5px] font-medium text-ink-2 transition-colors hover:bg-surface-2 hover:text-ink", filter === t.key && "bg-surface-2 text-ink")}>
            {t.label}
            {countFor[t.key] !== undefined && <span className={cn("tnum text-[11px]", t.key === "at_risk" && countFor[t.key] ? "text-warn" : "text-ink-3")}>{countFor[t.key]}</span>}
          </Link>
        ))}
        <div className="ml-auto">
          <InboxSearch filter={filter} q={sp.q ?? ""} />
        </div>
      </div>
      <div className="flex min-h-0 flex-1">
      <div className="min-w-0 flex-1 overflow-y-auto">
        <div className="flex items-center gap-3 px-5 py-2 text-[12px] text-ink-3 hairline-b">
          <label className="flex items-center gap-1.5"><input type="checkbox" className="size-3.5 accent-[var(--accent)]" /> Select all</label>
          <span>Sort by: <strong className="font-medium text-ink-2">Priority, then last updated</strong></span>
          <span className="ml-auto tnum">1 – {rows.length} of {rows.length}</span>
          <a href="/api/tickets.csv" className="font-medium text-accent-ink hover:underline">Export</a>
        </div>
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
                      <span className="font-mono text-[11px]">#{t.ref}</span>
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
                  <span className="flex items-center gap-1.5">
                    {t.status === "open" && !t.assigneeId && <span className="rounded bg-ok-soft px-1.5 py-0.5 text-[11px] font-medium text-ok">New</span>}
                    {t.requesterResponded && !["resolved", "closed", "cancelled"].includes(t.status) && <span className="rounded bg-accent-soft px-1.5 py-0.5 text-[11px] font-medium text-accent-ink">Requester responded</span>}
                    {t.status === "closed" || t.status === "resolved" || t.status === "cancelled" ? <span className="text-[12px] text-ink-4">{t.sla.status === "met" ? "Resolved on time" : t.sla.status === "breached" ? "Resolved late" : ""}</span> : <SlaChip sla={t.sla} compact />}
                  </span>
                  <span className="truncate text-[12px] text-ink-3">{t.groupName ?? "—"}</span>
                  <span className="flex justify-center">{t.assignee ? <Avatar name={t.assignee} size={22} /> : <span className="inline-block size-[22px] rounded-full border border-dashed border-line-strong" title="Unassigned" />}</span>
                  <span className="tnum text-right text-[12px] text-ink-3" title={`Created ${format(t.createdAt, "d MMM yyyy, HH:mm")}`}>{relTime(t.updatedAt)}</span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </div>
      <FilterPane current={{ ...sp }} groups={groups.map((g) => ({ id: g.id, name: g.name }))} agents={agents.map((a) => ({ id: a.id, name: a.displayName }))} departments={deptRows.map((d) => d.d!).filter(Boolean)} views={savedViews} meId={me.id} />
      </div>
    </>
  );
}
