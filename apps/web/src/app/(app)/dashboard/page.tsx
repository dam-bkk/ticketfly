import Link from "next/link";
import { AlertTriangle, CheckCircle2, Clock } from "lucide-react";
import { db, schema } from "@ticketfly/db";
import { asc, sql } from "drizzle-orm";
import { requireStaff } from "@/lib/auth";
import { dashboardStats } from "@/lib/queries";
import { workspaceContext } from "@/lib/workspace";
import { cn, minutesLabel, pct } from "@/lib/utils";
import { Topbar } from "@/components/shell/topbar";
import { Bars, Donut, Sparkline } from "@/components/ui/sparkline";

export const metadata = { title: "Dashboard" };

const TEAM_SHORT: Record<string, string> = { "Cloud Infrastructure Support": "Infra", "Security Operations Centre": "SOC", Database: "Database", "Servicedesk Support": "Service Desk", Automation: "Automation" };
const TEAM_TONE: Record<string, string> = { Infra: "bg-crit-soft text-crit", SOC: "bg-ok-soft text-ok", Database: "bg-warn-soft text-warn", "Service Desk": "bg-accent-soft text-accent-ink", Automation: "bg-violet-soft text-violet" };

/**
 * Freshservice-shaped dashboard: per-team unresolved tiles, per-agent breakdowns, my pending approvals —
 * then the service-wide charts. Widgets are scoped to the teams you belong to (admins see all).
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
  const { k, daily, byCategory, bySource } = await dashboardStats();
  const slaRate = k.slaTotal ? k.slaMet / k.slaTotal : 0;
  const maxCat = Math.max(...byCategory.map((c) => Number(c.n)), 1);
  const sourceColors: Record<string, string> = { portal: "var(--accent)", email: "var(--violet)", agent: "var(--info)", import: "var(--ink-4)", system: "var(--warn)" };
  const totalSource = bySource.reduce((a, s) => a + Number(s.n), 0) || 1;

  return (
    <>
      <Topbar crumbs={[{ label: "Dashboard" }, { label: me.role === "admin" ? "All teams" : "My teams" }]} />
      <div className="flex-1 overflow-y-auto">
        <div className="mx-auto max-w-[1240px] space-y-5 px-6 py-5 rise">
          <div className="flex items-center gap-3 text-[12px] text-ink-3">
            <span>Visible to: <strong className="font-medium text-ink-2">{me.role === "admin" ? "everyone" : "only me"}</strong></span>
            <span aria-hidden>·</span>
            <span>Workspace {current.name}</span>
            <span className="ml-auto flex gap-3">
              <Link href="/admin/activity" className="hover:text-ink">Recent activity</Link>
              <Link href="/it-ops/status" className="hover:text-ink">Announcements</Link>
            </span>
          </div>

          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
            {teams.map((g) => {
              const s = stats.find((x) => x.id === g.id);
              const short = TEAM_SHORT[g.name] ?? g.name;
              return (
                <Link key={g.id} href={`/tickets?f=open&group=${g.id}`} className={cn("grid grid-rows-[20px_1fr_16px] gap-2 rounded-lg p-4 transition-shadow hover:shadow-2", TEAM_TONE[short] ?? "bg-surface-2 text-ink-2")}>
                  <div className="flex items-center justify-between">
                    <span className="truncate text-[13px] font-semibold">{short}</span>
                    {s && s.overdue > 0 ? <AlertTriangle className="size-4 shrink-0" /> : <CheckCircle2 className="size-4 shrink-0 opacity-60" />}
                  </div>
                  <p className="tnum self-end text-[30px] font-semibold leading-none tracking-[-0.02em]">{s?.unresolved ?? 0}<span className="ml-1.5 text-[11.5px] font-medium opacity-70">unresolved</span></p>
                  <p className="text-[11.5px] opacity-80">{s?.overdue ?? 0} overdue · {s?.unassigned ?? 0} unassigned</p>
                </Link>
              );
            })}
            <Link href="/changes?f=approval" className="panel grid grid-rows-[20px_1fr_16px] gap-2 p-4 transition-shadow hover:shadow-2">
              <span className="truncate text-[13px] font-semibold">My Pending Approvals</span>
              <p className={cn("tnum self-end text-[30px] font-semibold leading-none tracking-[-0.02em]", approvals.length && "text-accent-ink")}>{approvals.length}<span className="ml-1.5 text-[11.5px] font-medium text-ink-3">waiting</span></p>
              <p className="text-[11.5px] text-ink-3">Changes, tickets &amp; post-incident reports</p>
            </Link>
          </div>

          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {teams.slice(0, 6).map((g) => {
              const rows = agentRows.filter((r) => r.group_id === g.id);
              const max = Math.max(...rows.map((r) => r.unresolved), 1);
              const maxClosed = Math.max(...rows.map((r) => r.closed), 1);
              const short = TEAM_SHORT[g.name] ?? g.name;
              return (
                <section key={g.id} className="panel p-4">
                  <div className="mb-3 flex items-baseline justify-between">
                    <h2 className="text-[13.5px] font-semibold">Current Unresolved – {short}</h2>
                    <Link href={`/tickets?f=open&group=${g.id}`} className="text-[12px] font-medium text-accent-ink hover:underline">View all</Link>
                  </div>
                  <ul className="space-y-2.5">
                    {rows.slice(0, 5).map((r) => (
                      <li key={r.id} className="text-[12.5px]">
                        <div className="flex justify-between"><span className={cn(r.id === me.id && "font-medium")}>{r.display_name}{r.id === me.id ? " (Me)" : ""}</span><span className="tnum text-ink-2">{r.unresolved}</span></div>
                        <div className="bar mt-1"><i style={{ width: `${(r.unresolved / max) * 100}%`, background: "var(--violet)" }} /></div>
                      </li>
                    ))}
                    {rows.length === 0 && <li className="text-[12px] text-ink-3">No members yet.</li>}
                  </ul>
                  <p className="label mb-2 mt-4">Total closed – {short}</p>
                  <ul className="space-y-1.5">
                    {rows.slice(0, 3).map((r) => (
                      <li key={r.id} className="grid grid-cols-[1fr_1fr_36px] items-center gap-2 text-[12px]"><span className="truncate text-ink-2">{r.display_name}</span><span className="bar"><i style={{ width: `${(r.closed / maxClosed) * 100}%`, background: "var(--violet)", opacity: 0.6 }} /></span><span className="tnum text-right text-ink-3">{r.closed}</span></li>
                    ))}
                  </ul>
                </section>
              );
            })}
          </div>

          {approvals.length > 0 && (
            <section className="panel p-4">
              <h2 className="mb-2 text-[13.5px] font-semibold">Waiting for your decision</h2>
              <ul className="divide-y divide-line">
                {approvals.map((a) => (
                  <li key={a.id} className="flex items-center gap-3 py-2 text-[13px]">
                    <Clock className="size-3.5 text-warn" />
                    <Link href={`/changes/${a.id}`} className="flex-1 font-medium text-accent-ink hover:underline">{a.title}</Link>
                    <span className="text-[12px] text-ink-3">CHG-{a.id}</span>
                  </li>
                ))}
              </ul>
            </section>
          )}

          <h2 className="pt-2 text-[15px] font-semibold tracking-[-0.01em]">Service overview · last 30 days</h2>
          <div className="grid grid-cols-2 gap-3 md:grid-cols-4 xl:grid-cols-7">
            <Kpi label="Open" value={k.open} spark={daily.map((d) => d.created)} href="/tickets" />
            <Kpi label="Unassigned" value={k.unassigned} tone={k.unassigned > 10 ? "warn" : undefined} href="/tickets?f=unassigned" />
            <Kpi label="Due within 24h" value={k.atRisk} tone={k.atRisk ? "warn" : undefined} href="/tickets?f=at_risk" />
            <Kpi label="Breached" value={k.breached} tone={k.breached ? "crit" : undefined} href="/tickets?f=at_risk" />
            <Kpi label="Median first reply" value={minutesLabel(k.medianFirstResponseMin)} sub="business time" />
            <Kpi label="Resolved · 7d" value={k.resolved7} sub={`${k.created7} created`} spark={daily.map((d) => d.resolved).slice(-7)} sparkColor="var(--ok)" />
            <Kpi label="CSAT" value={k.csatN ? `${k.csat.toFixed(1)} / 5` : "—"} sub={k.csatN ? `${k.csatN} ratings` : "no ratings yet"} />
          </div>
          <div className="grid gap-4 lg:grid-cols-[1.6fr_1fr]">
            <section className="panel p-5">
              <div className="mb-4 flex items-baseline justify-between">
                <h2 className="text-[14px] font-semibold">Created vs resolved</h2>
                <span className="flex items-center gap-3 text-[12px] text-ink-3"><span className="flex items-center gap-1.5"><i className="size-2 rounded-sm bg-accent" /> Created</span><span className="flex items-center gap-1.5"><i className="size-2 rounded-sm bg-ok" /> Resolved</span></span>
              </div>
              <Bars data={daily.map((d) => [d.created, d.resolved] as [number, number])} labels={daily.map((d) => d.label)} color="var(--accent)" color2="var(--ok)" height={160} width={720} />
            </section>
            <section className="panel p-5">
              <h2 className="mb-4 text-[14px] font-semibold">SLA compliance</h2>
              <div className="flex items-center gap-5">
                <div className="relative">
                  <Donut segments={[{ value: k.slaMet, color: "var(--ok)" }, { value: Math.max(0, k.slaTotal - k.slaMet), color: "var(--crit)" }]} size={116} thickness={12} />
                  <span className="tnum absolute inset-0 flex items-center justify-center text-[20px] font-semibold">{pct(slaRate)}</span>
                </div>
                <dl className="space-y-2 text-[13px]"><div><dt className="text-ink-3">Resolved within SLA</dt><dd className="tnum font-medium">{k.slaMet} of {k.slaTotal}</dd></div><div><dt className="text-ink-3">Target</dt><dd className="font-medium">95%</dd></div></dl>
              </div>
              <div className="mt-5">
                <p className="label mb-2">By channel</p>
                <div className="flex h-2 overflow-hidden rounded-full bg-surface-3">{bySource.map((s) => <span key={s.source} style={{ width: `${(Number(s.n) / totalSource) * 100}%`, background: sourceColors[s.source] }} />)}</div>
                <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-[12px] text-ink-3">{bySource.map((s) => <span key={s.source} className="flex items-center gap-1.5 capitalize"><i className="size-2 rounded-sm" style={{ background: sourceColors[s.source] }} /> {s.source} <span className="tnum text-ink-4">{s.n}</span></span>)}</div>
              </div>
            </section>
          </div>
          <section className="panel p-5">
            <h2 className="mb-4 text-[14px] font-semibold">Top categories</h2>
            <ul className="grid gap-x-8 gap-y-2.5 md:grid-cols-2">
              {byCategory.map((c) => (
                <li key={c.name ?? "none"} className="grid grid-cols-[150px_1fr_36px] items-center gap-3 text-[13px]"><span className="truncate text-ink-2">{c.name ?? "Uncategorised"}</span><span className="bar"><i style={{ width: `${(Number(c.n) / maxCat) * 100}%` }} /></span><span className="tnum text-right text-ink-3">{c.n}</span></li>
              ))}
            </ul>
          </section>
        </div>
      </div>
    </>
  );
}

function Kpi({ label, value, sub, tone, spark, sparkColor, href }: { label: string; value: number | string; sub?: string; tone?: "warn" | "crit"; spark?: number[]; sparkColor?: string; href?: string }) {
  const body = (
    <>
      <p className="label">{label}</p>
      <div className="mt-2 flex items-end justify-between gap-2">
        <span className={`tnum text-[24px] font-semibold leading-none tracking-[-0.02em] ${tone === "crit" ? "text-crit" : tone === "warn" ? "text-warn" : ""}`}>{value}</span>
        {spark && <Sparkline data={spark} width={64} height={24} stroke={sparkColor} />}
      </div>
      {sub && <p className="mt-1.5 text-[11.5px] text-ink-3">{sub}</p>}
    </>
  );
  return href ? <Link href={href} className="panel block p-4 transition-shadow hover:shadow-2">{body}</Link> : <div className="panel p-4">{body}</div>;
}
