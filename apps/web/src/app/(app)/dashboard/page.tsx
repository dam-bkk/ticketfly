import Link from "next/link";
import { AlertTriangle, CheckCircle2, ClipboardCheck, Clock } from "lucide-react";
import { db, schema } from "@ticketfly/db";
import { asc, sql } from "drizzle-orm";
import { requireStaff } from "@/lib/auth";
import { dashboardStats, inboxCounts, openCount } from "@/lib/queries";
import { workspaceContext } from "@/lib/workspace";
import { cn, minutesLabel, pct } from "@/lib/utils";
import { Topbar } from "@/components/shell/topbar";
import { ButtonLink } from "@/components/ui/button";
import { Empty } from "@/components/ui/empty";
import { Bars, Donut, Sparkline } from "@/components/ui/sparkline";

export const metadata = { title: "Dashboard" };

const TEAM_SHORT: Record<string, string> = { "Cloud Infrastructure Support": "Infra", "Security Operations Centre": "SOC", Database: "Database", "Servicedesk Support": "Service Desk", Automation: "Automation" };
/** Team colour is carried only by the 8px dot and the big number — cards themselves are plain panels. */
const TEAM_TONE: Record<string, { dot: string; num: string }> = {
  Infra: { dot: "bg-crit", num: "text-crit" },
  SOC: { dot: "bg-ok", num: "text-ok" },
  Database: { dot: "bg-warn", num: "text-warn" },
  "Service Desk": { dot: "bg-accent", num: "text-accent-ink" },
  Automation: { dot: "bg-violet", num: "text-violet" },
};
const SOURCE_COLOR: Record<string, string> = { portal: "var(--accent)", email: "var(--info)", agent: "var(--ok)", import: "var(--ink-4)", system: "var(--warn)" };

/**
 * Freshservice-shaped dashboard: per-team unresolved tiles, per-agent breakdowns, my pending approvals —
 * then ONE service-wide KPI row and the charts. Every count comes from the same selectors as the sidebar
 * badge and the /tickets tabs (see openCount / inboxCounts in lib/queries.ts), so one screen shows one number.
 */
export default async function Dashboard() {
  const me = await requireStaff();
  const { current } = await workspaceContext(me);
  const groups = await db.select().from(schema.groups).orderBy(asc(schema.groups.id));
  const myGroupIds = new Set((await db.select({ g: schema.groupMembers.groupId }).from(schema.groupMembers).where(sql`person_id = ${me.id}`)).map((x) => x.g));
  const visible = me.role === "admin" ? groups : groups.filter((g) => myGroupIds.has(g.id));
  const teams = visible.length ? visible : groups;
  const stats = (await db.execute(sql`
    select g.id, g.name,
      (select count(*) from tickets t where t.group_id = g.id and t.workspace = ${current.slug} and t.status in ('open','in_progress','pending','pending_approval','on_hold'))::int unresolved,
      (select count(*) from tickets t where t.group_id = g.id and t.workspace = ${current.slug} and t.status in ('open','in_progress') and t.resolution_due_at < now())::int overdue,
      (select count(*) from tickets t where t.group_id = g.id and t.workspace = ${current.slug} and t.status in ('open','in_progress','pending','pending_approval','on_hold') and t.assignee_id is null)::int unassigned
    from groups g order by g.id`)) as unknown as { id: number; name: string; unresolved: number; overdue: number; unassigned: number }[];
  const agentRows = (await db.execute(sql`
    select gm.group_id, p.id, p.display_name,
      (select count(*) from tickets t where t.assignee_id = p.id and t.group_id = gm.group_id and t.status in ('open','in_progress','pending','pending_approval','on_hold'))::int unresolved,
      (select count(*) from tickets t where t.assignee_id = p.id and t.group_id = gm.group_id and t.status in ('resolved','closed'))::int closed
    from group_members gm join people p on p.id = gm.person_id order by unresolved desc, closed desc`)) as unknown as { group_id: number; id: number; display_name: string; unresolved: number; closed: number }[];
  const approvals = (await db.execute(sql`select c.id, c.title from changes c, jsonb_array_elements(c.approvals) a where c.status = 'awaiting_approval' and (a->>'personId')::int = ${me.id} and a->>'decision' = 'pending'`)) as unknown as { id: number; title: string }[];
  const [open, c, { k, daily, byCategory, bySource }] = await Promise.all([openCount({ workspace: current.slug }), inboxCounts(me.id, current.slug), dashboardStats(current.slug)]);
  const slaRate = k.slaTotal ? k.slaMet / k.slaTotal : 0;
  const maxCat = Math.max(...byCategory.map((x) => Number(x.n)), 1);
  const totalSource = bySource.reduce((a, s) => a + Number(s.n), 0) || 1;

  return (
    <>
      <Topbar crumbs={[{ label: "Dashboard" }, { label: me.role === "admin" ? "All teams" : "My teams" }]} />
      <div className="flex-1 overflow-y-auto">
        <div className="mx-auto max-w-[1240px] space-y-3 px-6 py-4 rise">
          <div className="flex items-center gap-3 text-[12.5px] text-ink-3">
            <span>Visible to: <strong className="font-medium text-ink-2">{me.role === "admin" ? "everyone" : "only me"}</strong></span>
            <span aria-hidden>·</span>
            <span>Workspace {current.name}</span>
            <span className="ml-auto flex gap-3">
              <Link href="/admin/activity" className="hover:text-ink">Recent activity</Link>
              <Link href="/it-ops/status" className="hover:text-ink">Announcements</Link>
            </span>
          </div>

          {/* Per-team unresolved tiles (required by the client; one identical card treatment) */}
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
            {teams.map((g) => {
              const s = stats.find((x) => x.id === g.id);
              const short = TEAM_SHORT[g.name] ?? g.name;
              const tone = TEAM_TONE[short] ?? { dot: "bg-ink-3", num: "text-ink" };
              const overdue = s?.overdue ?? 0;
              return (
                <Link key={g.id} href={`/tickets?f=open&group=${g.id}`} title={`Unresolved · ${g.name}`} className="panel grid grid-rows-[20px_1fr_16px] gap-2 p-4 transition-shadow hover:shadow-2">
                  <div className="flex min-w-0 items-center gap-2">
                    <i aria-hidden className={cn("size-2 shrink-0 rounded-full", tone.dot)} />
                    <span className="truncate text-[13.5px] font-semibold text-ink">{short}</span>
                    {overdue > 0 ? <AlertTriangle className="ml-auto size-4 shrink-0 text-crit" aria-label={`${overdue} overdue`} /> : <CheckCircle2 className="ml-auto size-4 shrink-0 text-ink-3" aria-label="Nothing overdue" />}
                  </div>
                  <p className={cn("tnum self-end text-[30px] font-semibold leading-none tracking-[-0.02em]", tone.num)}>
                    {s?.unresolved ?? 0}
                    <span className="ml-1.5 text-[11px] font-medium text-ink-3">unresolved</span>
                  </p>
                  <p className="truncate text-[11px] text-ink-3">{overdue} overdue · {s?.unassigned ?? 0} unassigned</p>
                </Link>
              );
            })}
            <Link href="/changes?f=approval" title="My Pending Approvals — changes awaiting my decision" className="panel grid grid-rows-[20px_1fr_16px] gap-2 p-4 transition-shadow hover:shadow-2">
              <div className="flex min-w-0 items-center gap-2">
                <span className="truncate text-[13.5px] font-semibold text-ink">My Approvals</span>
                <ClipboardCheck className="ml-auto size-4 shrink-0 text-ink-3" />
              </div>
              <p className={cn("tnum self-end text-[30px] font-semibold leading-none tracking-[-0.02em]", approvals.length ? "text-accent-ink" : "text-ink")}>
                {approvals.length}
                <span className="ml-1.5 text-[11px] font-medium text-ink-3">waiting</span>
              </p>
              <p className="truncate text-[11px] text-ink-3">Changes awaiting my decision</p>
            </Link>
          </div>

          {/* Per-agent breakdown per team (required by the client) */}
          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
            {teams.slice(0, 6).map((g) => {
              const rows = agentRows.filter((r) => r.group_id === g.id);
              const max = Math.max(...rows.map((r) => r.unresolved), 1);
              const maxClosed = Math.max(...rows.map((r) => r.closed), 1);
              const short = TEAM_SHORT[g.name] ?? g.name;
              if (rows.length === 0) {
                return (
                  <div key={g.id} className="flex h-10 items-center gap-3 rounded-lg px-4 text-[12.5px] text-ink-3 hairline md:col-span-2 xl:col-span-3">
                    <span className="font-medium text-ink-2">Current Unresolved – {short}</span>
                    <span>No members yet.</span>
                    <Link href="/admin" className="ml-auto font-medium text-accent-ink hover:underline">Add members</Link>
                  </div>
                );
              }
              return (
                <section key={g.id} className="panel flex flex-col p-4">
                  <div className="mb-3 flex items-baseline justify-between">
                    <h2 className="text-[13.5px] font-semibold">Current Unresolved – {short}</h2>
                    <Link href={`/tickets?f=open&group=${g.id}`} className="text-[12.5px] font-medium text-accent-ink hover:underline">View all</Link>
                  </div>
                  <ul className="space-y-2">
                    {rows.slice(0, 5).map((r) => (
                      <li key={r.id} className="text-[12.5px]">
                        <div className="flex justify-between"><span className={cn(r.id === me.id && "font-medium")}>{r.display_name}{r.id === me.id ? " (Me)" : ""}</span><span className="tnum text-ink-2">{r.unresolved}</span></div>
                        <div className="bar mt-1"><i style={{ width: `${(r.unresolved / max) * 100}%` }} /></div>
                      </li>
                    ))}
                  </ul>
                  <p className="label mb-2 mt-4">Total closed – {short}</p>
                  <ul className="space-y-2">
                    {rows.slice(0, 3).map((r) => (
                      <li key={r.id} className="grid grid-cols-[1fr_1fr_36px] items-center gap-2 text-[12.5px]"><span className="truncate text-ink-2">{r.display_name}</span><span className="bar"><i style={{ width: `${(r.closed / maxClosed) * 100}%`, opacity: 0.55 }} /></span><span className="tnum text-right text-ink-3">{r.closed}</span></li>
                    ))}
                  </ul>
                </section>
              );
            })}
          </div>

          {approvals.length > 0 ? (
            <section className="panel p-4">
              <h2 className="mb-2 text-[13.5px] font-semibold">Waiting for your decision</h2>
              <ul className="divide-y divide-line">
                {approvals.map((a) => (
                  <li key={a.id} className="flex items-center gap-3 py-2 text-[13.5px]">
                    <Clock className="size-3.5 text-warn" />
                    <Link href={`/changes/${a.id}`} className="flex-1 font-medium text-accent-ink hover:underline">{a.title}</Link>
                    <span className="text-[12.5px] text-ink-3">CHG-{a.id}</span>
                  </li>
                ))}
              </ul>
            </section>
          ) : (
            <div className="flex h-10 items-center gap-3 rounded-lg px-4 text-[12.5px] text-ink-3 hairline">
              <ClipboardCheck className="size-3.5" />
              <span>No changes waiting for your decision.</span>
              <Link href="/changes" className="ml-auto font-medium text-accent-ink hover:underline">All changes</Link>
            </div>
          )}

          {/* ONE service-wide KPI row — every tile is the same number as the matching /tickets tab */}
          <h2 className="pt-2 text-[16px] font-semibold tracking-[-0.01em]">Service overview <span className="text-[12.5px] font-normal text-ink-3">· workspace {current.name} · all teams</span></h2>
          <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
            <Kpi label="Open · all teams" value={open} spark={daily.map((d) => d.created)} href="/tickets?f=open" sub="same count as the sidebar and the All open tab" />
            <Kpi label="Unassigned · all teams" value={c.unassigned} tone={c.unassigned > 10 ? "warn" : undefined} href="/tickets?f=unassigned" sub="waiting for an owner" />
            <Kpi label="Due within 24h · all teams" value={c.atRisk} tone={c.atRisk ? "warn" : undefined} href="/tickets?f=at_risk" sub="resolution or first reply at risk" />
            <Kpi label="Breached · all teams" value={c.breached} tone={c.breached ? "crit" : undefined} href="/tickets?due=overdue" sub="past resolution target" />
          </div>
          <dl className="flex flex-wrap items-center gap-x-6 gap-y-1 rounded-lg px-4 py-2 text-[12.5px] text-ink-3 hairline">
            <div className="flex items-baseline gap-2"><dt>Median first reply · 30d</dt><dd className="tnum font-medium text-ink">{minutesLabel(k.medianFirstResponseMin)}</dd></div>
            <div className="flex items-baseline gap-2"><dt>Resolved · 7d</dt><dd className="tnum font-medium text-ink">{k.resolved7}</dd><dd className="tnum">/ {k.created7} created</dd></div>
            <div className="flex items-baseline gap-2"><dt>CSAT · 30d</dt><dd className="tnum font-medium text-ink">{k.csatN ? `${k.csat.toFixed(1)} / 5` : "—"}</dd><dd className="tnum">{k.csatN ? `${k.csatN} ratings` : "no ratings yet"}</dd></div>
            <div className="ml-auto flex items-baseline gap-2"><dt>Resolved within SLA · 30d</dt><dd className={cn("tnum font-medium", slaRate >= 0.95 ? "text-ok" : slaRate >= 0.8 ? "text-warn" : "text-crit")}>{pct(slaRate)}</dd></div>
          </dl>

          {/* Charts — equal heights, side by side */}
          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
            <section className="panel flex flex-col p-4">
              <div className="mb-3 flex items-baseline justify-between">
                <h2 className="text-[13.5px] font-semibold">Created vs resolved · 30d</h2>
                <span className="flex items-center gap-3 text-[12.5px] text-ink-3"><span className="flex items-center gap-1.5"><i className="size-2 rounded-sm bg-accent" /> Created</span><span className="flex items-center gap-1.5"><i className="size-2 rounded-sm bg-ok" /> Resolved</span></span>
              </div>
              <div className="mt-auto">
                <Bars data={daily.map((d) => [d.created, d.resolved] as [number, number])} labels={daily.map((d) => d.label)} color="var(--accent)" color2="var(--ok)" height={150} width={380} />
              </div>
            </section>
            <section className="panel flex flex-col p-4">
              <h2 className="mb-3 text-[13.5px] font-semibold">SLA compliance · 30d</h2>
              <div className="flex items-center gap-4">
                <div className="relative">
                  <Donut segments={[{ value: k.slaMet, color: "var(--ok)" }, { value: Math.max(0, k.slaTotal - k.slaMet), color: "var(--crit)" }]} size={96} thickness={10} />
                  <span className="tnum absolute inset-0 flex items-center justify-center text-[16px] font-semibold">{pct(slaRate)}</span>
                </div>
                <dl className="space-y-1 text-[12.5px]"><div><dt className="text-ink-3">Resolved within SLA</dt><dd className="tnum font-medium">{k.slaMet} of {k.slaTotal}</dd></div><div><dt className="text-ink-3">Target</dt><dd className="font-medium">95%</dd></div></dl>
              </div>
              <div className="mt-auto pt-4">
                <p className="label mb-2">By channel</p>
                <div className="flex h-2 overflow-hidden rounded-full bg-surface-3">{bySource.map((s) => <span key={s.source} style={{ width: `${(Number(s.n) / totalSource) * 100}%`, background: SOURCE_COLOR[s.source] }} />)}</div>
                <div className="mt-2 flex flex-wrap gap-x-3 gap-y-1 text-[12.5px] text-ink-3">{bySource.map((s) => <span key={s.source} className="flex items-center gap-1.5 capitalize"><i className="size-2 rounded-sm" style={{ background: SOURCE_COLOR[s.source] }} /> {s.source} <span className="tnum">{s.n}</span></span>)}</div>
              </div>
            </section>
            <section className="panel flex flex-col p-4 md:col-span-2 xl:col-span-1">
              <h2 className="mb-3 text-[13.5px] font-semibold">Top categories · 30d</h2>
              {byCategory.length === 0 ? (
                <Empty title="No tickets in the last 30 days" action={<ButtonLink href="/tickets" size="sm">Open the ticket list</ButtonLink>} />
              ) : (
                <ul className="space-y-2">
                  {byCategory.map((x) => (
                    <li key={x.name ?? "none"} className="grid grid-cols-[130px_1fr_36px] items-center gap-3 text-[12.5px]"><span className="truncate text-ink-2">{x.name ?? "Uncategorised"}</span><span className="bar"><i style={{ width: `${(Number(x.n) / maxCat) * 100}%` }} /></span><span className="tnum text-right text-ink-3">{x.n}</span></li>
                  ))}
                </ul>
              )}
            </section>
          </div>
        </div>
      </div>
    </>
  );
}

function Kpi({ label, value, sub, tone, spark, href }: { label: string; value: number; sub?: string; tone?: "warn" | "crit"; spark?: number[]; href: string }) {
  return (
    <Link href={href} className="panel block p-4 transition-colors hover:bg-surface-2">
      <p className="label truncate">{label}</p>
      <div className="mt-2 flex items-end justify-between gap-2">
        <span className={cn("tnum text-[22px] font-semibold leading-none tracking-[-0.02em]", tone === "crit" ? "text-crit" : tone === "warn" ? "text-warn" : "text-ink")}>{value}</span>
        {spark && <Sparkline data={spark} width={64} height={22} />}
      </div>
      {sub && <p className="mt-1.5 truncate text-[11px] text-ink-3">{sub}</p>}
    </Link>
  );
}
