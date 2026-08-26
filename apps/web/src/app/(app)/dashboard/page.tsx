import Link from "next/link";
import { requireStaff } from "@/lib/auth";
import { dashboardStats } from "@/lib/queries";
import { minutesLabel, pct } from "@/lib/utils";
import { Topbar } from "@/components/shell/topbar";
import { Avatar } from "@/components/ui/avatar";
import { Bars, Donut, Sparkline } from "@/components/ui/sparkline";

export const metadata = { title: "Dashboard" };

export default async function Dashboard() {
  await requireStaff();
  const { k, daily, byCategory, workload, bySource } = await dashboardStats();
  const created = daily.map((d) => d.created);
  const resolved = daily.map((d) => d.resolved);
  const slaRate = k.slaTotal ? k.slaMet / k.slaTotal : 0;
  const maxCat = Math.max(...byCategory.map((c) => Number(c.n)), 1);
  const sourceColors: Record<string, string> = { portal: "var(--accent)", email: "var(--violet)", agent: "var(--info)", import: "var(--ink-4)", system: "var(--ink-4)" };
  const totalSource = bySource.reduce((a, s) => a + Number(s.n), 0) || 1;

  return (
    <>
      <Topbar crumbs={[{ label: "Dashboard" }]} />
      <div className="flex-1 overflow-y-auto">
        <div className="mx-auto max-w-[1180px] space-y-5 px-6 py-6 rise">
          <div>
            <h1 className="text-[20px] font-semibold tracking-[-0.01em]">Service overview</h1>
            <p className="text-[13px] text-ink-3">Last 30 days · Hong Kong business hours · updated live</p>
          </div>

          <div className="grid grid-cols-2 gap-3 md:grid-cols-4 xl:grid-cols-7">
            <Kpi label="Open" value={k.open} spark={created} href="/tickets" />
            <Kpi label="Unassigned" value={k.unassigned} tone={k.unassigned > 10 ? "warn" : undefined} href="/tickets?f=unassigned" />
            <Kpi label="Due within 24h" value={k.atRisk} tone={k.atRisk ? "warn" : undefined} href="/tickets?f=at_risk" />
            <Kpi label="Breached" value={k.breached} tone={k.breached ? "crit" : undefined} href="/tickets?f=at_risk" />
            <Kpi label="Median first reply" value={minutesLabel(k.medianFirstResponseMin)} sub="business time" />
            <Kpi label="Resolved · 7d" value={k.resolved7} sub={`${k.created7} created`} spark={resolved.slice(-7)} sparkColor="var(--ok)" />
            <Kpi label="CSAT" value={k.csatN ? `${k.csat.toFixed(1)} / 5` : "—"} sub={k.csatN ? `${k.csatN} ratings` : "no ratings yet"} />
          </div>

          <div className="grid gap-4 lg:grid-cols-[1.6fr_1fr]">
            <section className="panel p-5">
              <div className="mb-4 flex items-baseline justify-between">
                <h2 className="text-[14px] font-semibold">Created vs resolved</h2>
                <span className="flex items-center gap-3 text-[12px] text-ink-3">
                  <span className="flex items-center gap-1.5">
                    <i className="size-2 rounded-sm bg-accent" /> Created
                  </span>
                  <span className="flex items-center gap-1.5">
                    <i className="size-2 rounded-sm bg-ok" /> Resolved
                  </span>
                </span>
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
                <dl className="space-y-2 text-[13px]">
                  <div>
                    <dt className="text-ink-3">Resolved within SLA</dt>
                    <dd className="tnum font-medium">{k.slaMet} of {k.slaTotal}</dd>
                  </div>
                  <div>
                    <dt className="text-ink-3">Target</dt>
                    <dd className="font-medium">95%</dd>
                  </div>
                </dl>
              </div>
              <div className="mt-5">
                <p className="label mb-2">By channel</p>
                <div className="flex h-2 overflow-hidden rounded-full bg-surface-3">
                  {bySource.map((s) => (
                    <span key={s.source} style={{ width: `${(Number(s.n) / totalSource) * 100}%`, background: sourceColors[s.source] }} />
                  ))}
                </div>
                <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-[12px] text-ink-3">
                  {bySource.map((s) => (
                    <span key={s.source} className="flex items-center gap-1.5 capitalize">
                      <i className="size-2 rounded-sm" style={{ background: sourceColors[s.source] }} /> {s.source} <span className="tnum text-ink-4">{s.n}</span>
                    </span>
                  ))}
                </div>
              </div>
            </section>
          </div>

          <div className="grid gap-4 lg:grid-cols-2">
            <section className="panel p-5">
              <h2 className="mb-4 text-[14px] font-semibold">Top categories</h2>
              <ul className="space-y-2.5">
                {byCategory.map((c) => (
                  <li key={c.name ?? "none"} className="grid grid-cols-[150px_1fr_36px] items-center gap-3 text-[13px]">
                    <span className="truncate text-ink-2">{c.name ?? "Uncategorised"}</span>
                    <span className="bar">
                      <i style={{ width: `${(Number(c.n) / maxCat) * 100}%` }} />
                    </span>
                    <span className="tnum text-right text-ink-3">{c.n}</span>
                  </li>
                ))}
              </ul>
            </section>
            <section className="panel p-5">
              <h2 className="mb-4 text-[14px] font-semibold">Team load</h2>
              <ul className="space-y-1">
                {workload.map((w) => (
                  <li key={w.id} className="grid grid-cols-[1fr_60px_60px_70px] items-center gap-3 rounded-md px-2 py-1.5 text-[13px] hover:bg-surface-2">
                    <Link href={`/tickets?f=all`} className="flex min-w-0 items-center gap-2.5">
                      <Avatar name={w.name} size={26} />
                      <span className="min-w-0">
                        <span className="block truncate font-medium">{w.name}</span>
                        <span className="block truncate text-[11.5px] text-ink-3">{w.title}</span>
                      </span>
                    </Link>
                    <span className="tnum text-right">
                      <span className="block font-medium">{w.open}</span>
                      <span className="block text-[11px] text-ink-3">open</span>
                    </span>
                    <span className="tnum text-right">
                      <span className={`block font-medium ${w.urgent ? "text-warn" : ""}`}>{w.urgent}</span>
                      <span className="block text-[11px] text-ink-3">urgent</span>
                    </span>
                    <span className="tnum text-right">
                      <span className="block font-medium text-ok">{w.resolved7}</span>
                      <span className="block text-[11px] text-ink-3">resolved 7d</span>
                    </span>
                  </li>
                ))}
              </ul>
            </section>
          </div>
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
  return href ? (
    <Link href={href} className="panel block p-4 transition-shadow hover:shadow-2">
      {body}
    </Link>
  ) : (
    <div className="panel p-4">{body}</div>
  );
}
