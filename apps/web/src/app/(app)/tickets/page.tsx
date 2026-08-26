import Link from "next/link";
import { cookies } from "next/headers";
import { requireStaff } from "@/lib/auth";
import { inboxCounts, listInbox, type InboxFilter } from "@/lib/queries";
import { workspaceContext } from "@/lib/workspace";
import { cn, relTime, SORT_LABEL, type SortKey } from "@/lib/utils";
import { Topbar } from "@/components/shell/topbar";
import { Avatar } from "@/components/ui/avatar";
import { Empty } from "@/components/ui/empty";
import { PriorityMark, SlaChip, StatusPill, Tag } from "@/components/ui/pills";
import { InboxSearch } from "./search";
import { DensityToggle, FilterPane, FilterShell, FilterToggle, SortSelect, type ListFilter, type SavedView } from "./filter-pane";
import { listAgents, listGroups } from "@/lib/queries";
import { db, schema } from "@ticketfly/db";
import { asc, or, eq, isNotNull } from "drizzle-orm";
import { format } from "date-fns";
import { ChevronDown, ChevronUp, ChevronsUpDown } from "lucide-react";

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

const SORT_KEYS: SortKey[] = ["priority", "updated", "created", "due"];
const PRIORITY_RANK: Record<string, number> = { urgent: 0, high: 1, medium: 2, low: 3 };
const CLOSED = new Set(["resolved", "closed", "cancelled"]);

function queryString(sp: ListFilter, patch: Partial<ListFilter>) {
  const p = new URLSearchParams();
  for (const [k, v] of Object.entries({ ...sp, ...patch })) if (v) p.set(k, String(v));
  return p.size ? `?${p}` : "";
}

export default async function InboxPage({ searchParams }: { searchParams: Promise<ListFilter> }) {
  const me = await requireStaff();
  const sp = await searchParams;
  const filter = (TABS.some((t) => t.key === sp.f) ? sp.f : "open") as InboxFilter;
  const sort: SortKey = SORT_KEYS.includes(sp.sort as SortKey) ? (sp.sort as SortKey) : "priority";
  const dir: "asc" | "desc" = sp.dir === "asc" ? "asc" : "desc";
  const density = (await cookies()).get("tf_density")?.value === "compact" ? "compact" : "comfortable";
  const compact = density === "compact";
  const { current } = await workspaceContext(me);
  const adv = { group: sp.group, agent: sp.agent, status: sp.status, requester: sp.requester, department: sp.department, created: sp.created, due: sp.due, fr: sp.fr, priority: sp.priority, source: sp.source };
  const [fetched, counts, groups, agents, views, deptRows] = await Promise.all([
    listInbox({ filter, meId: me.id, q: sp.q, workspace: current.slug, adv }),
    inboxCounts(me.id, current.slug),
    listGroups(),
    listAgents(),
    db.select().from(schema.savedViews).where(or(eq(schema.savedViews.ownerId, me.id), eq(schema.savedViews.shared, true))).orderBy(asc(schema.savedViews.name)),
    db.selectDistinct({ d: schema.people.department }).from(schema.people).where(isNotNull(schema.people.department)).orderBy(asc(schema.people.department)),
  ]);
  // TODO: move sorting into listInbox (queries.ts) once it accepts sort/dir; sorted in-page for now over the fetched window.
  const rows = [...fetched].sort((a, b) => {
    const sign = dir === "asc" ? 1 : -1;
    let d = 0;
    if (sort === "priority") d = (PRIORITY_RANK[b.priority] ?? 9) - (PRIORITY_RANK[a.priority] ?? 9); // desc = urgent first
    else if (sort === "updated") d = a.updatedAt.getTime() - b.updatedAt.getTime();
    else if (sort === "created") d = a.createdAt.getTime() - b.createdAt.getTime();
    else d = a.sla.dueAt.getTime() - b.sla.dueAt.getTime();
    return d !== 0 ? d * sign : b.updatedAt.getTime() - a.updatedAt.getTime();
  });
  const savedViews: SavedView[] = views.map((v) => ({ id: v.id, name: v.name, shared: v.shared, ownerId: v.ownerId, filter: v.filter as ListFilter }));
  const activeView = savedViews.find((v) => String(v.id) === sp.view);
  const countFor: Partial<Record<InboxFilter, number>> = { open: counts.open, mine: counts.mine, unassigned: counts.unassigned, at_risk: counts.atRisk, waiting: counts.waiting, approval: counts.approval, legacy: counts.legacy };
  const activeFilters = Object.entries(adv).filter(([, v]) => v).length;

  /** Column header: sortable ones are links toggling sort/dir. */
  const Head = ({ k, children, className }: { k?: SortKey; children: React.ReactNode; className?: string }) => {
    if (!k) return <span className={cn("label truncate", className)}>{children}</span>;
    const on = sort === k;
    const nextDir = on ? (dir === "desc" ? "asc" : "desc") : "desc";
    const Caret = on ? (dir === "desc" ? ChevronDown : ChevronUp) : ChevronsUpDown;
    return (
      <Link href={`/tickets${queryString(sp, { sort: k, dir: nextDir })}`} title={`Sort by ${SORT_LABEL[k].toLowerCase()}${on ? ` (${dir === "desc" ? "descending" : "ascending"})` : ""}`} className={cn("label inline-flex items-center gap-0.5 truncate rounded hover:text-ink!", on && "text-ink!", className)}>
        {children}
        <Caret className={cn("size-3 shrink-0", on ? "text-accent-ink" : "text-ink-3")} aria-hidden />
      </Link>
    );
  };

  // Priority | Subject | Requester | Status | SLA | Assignee | Updated — ~636px of chrome; subject ≈ 424px at 1280 (pane collapsed), ≈ 332px at 1440 (pane open).
  // Priority text label only from 1600px, where the pane leaves room for it.
  const grid = "grid grid-cols-[20px_minmax(0,1fr)_minmax(140px,170px)_130px_112px_28px_84px] items-center gap-2.5 px-4 min-[1600px]:grid-cols-[76px_minmax(0,1fr)_minmax(140px,170px)_130px_112px_28px_84px]";

  return (
    <FilterShell>
      <Topbar crumbs={[{ label: "Tickets List" }, { label: activeView ? activeView.name : "All open" }]} />
      <div className="flex h-11 shrink-0 items-center gap-2 bg-surface pl-3 pr-3 hairline-b">
        <nav aria-label="Ticket views" className="no-scrollbar flex min-w-0 flex-1 items-center gap-1 overflow-x-auto pr-6 [mask-image:linear-gradient(to_right,#000_calc(100%-28px),transparent)]">
          {TABS.map((t) => (
            <Link key={t.key} href={`/tickets?f=${t.key}${sp.q ? `&q=${encodeURIComponent(sp.q)}` : ""}`} className={cn("flex h-7 shrink-0 items-center gap-1.5 whitespace-nowrap rounded-md px-2 text-[12.5px] font-medium text-ink-2 transition-colors hover:bg-surface-2 hover:text-ink", filter === t.key && "bg-surface-2 text-ink")}>
              {t.label}
              {countFor[t.key] !== undefined && <span className={cn("tnum text-[11px]", t.key === "at_risk" && countFor[t.key] ? "text-warn" : "text-ink-3")}>{countFor[t.key]}</span>}
            </Link>
          ))}
        </nav>
        <div className="shrink-0">
          <InboxSearch filter={filter} q={sp.q ?? ""} />
        </div>
      </div>
      <div className="flex min-h-0 flex-1">
        <div className="min-w-0 flex-1 overflow-y-auto">
          {/* Toolbar: sort control, density, count, export */}
          <div className="flex h-9 items-center gap-3 px-4 text-[12.5px] text-ink-3 hairline-b">
            <label className="flex items-center gap-1.5 text-ink-2"><input type="checkbox" className="size-3.5 accent-[var(--accent)]" aria-label="Select all" /> Select all</label>
            <SortSelect current={sp} sort={sort} dir={dir} />
            <span className="ml-auto tnum">1 – {rows.length} of {rows.length}</span>
            <DensityToggle density={density} />
            <FilterToggle active={activeFilters} />
            <a href="/api/tickets.csv" className="font-medium text-accent-ink hover:underline">Export</a>
          </div>
          {rows.length === 0 ? (
            <Empty title={sp.q ? `Nothing matches “${sp.q}”` : "Queue is clear"} hint={sp.q ? "Try an old Freshservice reference like INC-4210, or a word from the subject." : "New tickets from the portal and email land here."} />
          ) : (
            <>
              {/* Column headers */}
              <div className={cn(grid, "sticky top-0 z-10 h-8 bg-surface hairline-b")}>
                <Head k="priority"><span className="sr-only min-[1600px]:not-sr-only">Priority</span></Head>
                <Head>Subject</Head>
                <Head>Requester</Head>
                <Head>Status</Head>
                <Head k="due">SLA</Head>
                <span><span className="sr-only">Assignee</span></span>
                {sort === "created" ? <Head k="created" className="justify-end">Created</Head> : <Head k="updated" className="justify-end">Updated</Head>}
              </div>
              <ul className={cn("rise", compact && "density-compact")}>
                {rows.map((t) => {
                  const closed = CLOSED.has(t.status);
                  const isNew = t.status === "open" && !t.assigneeId;
                  return (
                    <li key={t.id} className="row hairline-b">
                      <Link href={`/tickets/${t.id}`} className={cn(grid, "py-1.5")}>
                        <PriorityMark priority={t.priority} withLabel="wide" />
                        <span className="min-w-0">
                          <span className="flex items-center gap-2 overflow-hidden">
                            <span className={cn("min-w-0 truncate text-[13.5px] font-medium text-ink", compact ? "leading-5" : "leading-[18px]")}>{t.subject}</span>
                            {t.tags.slice(0, 2).map((tag) => (
                              <Tag key={tag} className="hidden xl:inline-flex">{tag}</Tag>
                            ))}
                          </span>
                          {!compact && (
                            <span className="flex items-center gap-1.5 truncate text-[12.5px] leading-[15px] text-ink-3">
                              <span className="font-mono text-[11px]">#{t.ref}</span>
                              {isNew && <><span aria-hidden>·</span><span className="font-medium text-ok">New</span></>}
                              {t.requesterResponded && !closed && <><span aria-hidden>·</span><span className="font-medium text-accent-ink">Requester responded</span></>}
                              {t.messageCount > 0 && <><span aria-hidden>·</span><span className="tnum">{t.messageCount} {t.messageCount === 1 ? "message" : "messages"}</span></>}
                            </span>
                          )}
                        </span>
                        <span className="min-w-0">
                          <span className="block truncate text-[12.5px] leading-[18px] text-ink-2">{t.requester ?? "—"}</span>
                          {!compact && <span className="block truncate text-[11px] leading-4 text-ink-3">{t.requesterDept ?? " "}</span>}
                        </span>
                        <StatusPill status={t.status} className={cn("h-[22px] max-w-full justify-self-start whitespace-nowrap px-1.5", compact && "h-5 text-[11px]")} />
                        <span className="min-w-0 whitespace-nowrap">
                          {closed ? (
                            <span className="text-[12.5px] text-ink-3">{t.sla.status === "met" ? "Resolved on time" : t.sla.status === "breached" ? "Resolved late" : "—"}</span>
                          ) : (
                            <SlaChip sla={t.sla} compact className={cn("h-[22px] px-1.5", compact && "h-5 text-[11px]")} />
                          )}
                        </span>
                        <span className="flex justify-center">{t.assignee ? <Avatar name={t.assignee} size={compact ? 18 : 22} /> : <span className={cn("inline-block rounded-full border border-dashed border-line-strong", compact ? "size-[18px]" : "size-[22px]")} title="Unassigned" />}</span>
                        <span className="tnum truncate text-right text-[12.5px] text-ink-3" title={`Created ${format(t.createdAt, "d MMM yyyy, HH:mm")} · updated ${format(t.updatedAt, "d MMM yyyy, HH:mm")}`}>{relTime(sort === "created" ? t.createdAt : t.updatedAt)}</span>
                      </Link>
                    </li>
                  );
                })}
              </ul>
            </>
          )}
        </div>
        <FilterPane current={{ ...sp }} groups={groups.map((g) => ({ id: g.id, name: g.name }))} agents={agents.map((a) => ({ id: a.id, name: a.displayName }))} departments={deptRows.map((d) => d.d!).filter(Boolean)} views={savedViews} meId={me.id} />
      </div>
    </FilterShell>
  );
}
