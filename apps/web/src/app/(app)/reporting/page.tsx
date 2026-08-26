import Link from "next/link";
import { requireStaff } from "@/lib/auth";
import { reportingData } from "@/lib/modules";
import { cn, pct } from "@/lib/utils";
import { Topbar } from "@/components/shell/topbar";
import { Bars, Donut } from "@/components/ui/sparkline";

export const metadata = { title: "Reporting" };

export default async function ReportingPage() {
  await requireStaff();
  const { monthly, byTeam, byCategory, byDept, byChannel, buckets, csat } = await reportingData();
  const maxDept = Math.max(...byDept.map((d) => Number(d.n)), 1);
  const maxBucket = Math.max(...buckets.map((b) => b.n), 1);
  const channelTotal = byChannel.reduce((s, c) => s + Number(c.n), 0) || 1;
  const csatTotal = csat.reduce((s, c) => s + Number(c.n), 0) || 1;
  const colors: Record<string, string> = { portal: "var(--accent)", email: "var(--violet)", agent: "var(--info)", import: "var(--ink-4)", system: "var(--warn)" };
  return (
    <>
      <Topbar crumbs={[{ label: "Reporting" }, { label: "Analytics" }]} />
      <div className="flex-1 overflow-y-auto">
        <div className="mx-auto max-w-[1180px] space-y-5 px-6 py-6 rise">
          <div className="flex items-end justify-between">
            <div>
              <h1 className="text-[20px] font-semibold tracking-[-0.01em]">Analytics</h1>
              <p className="text-[13px] text-ink-3">Every number is a query on our own database — no report tiers, no export caps. Last 12 months unless stated.</p>
            </div>
            <div className="flex gap-2 text-[12.5px]">
              <Link href="/reporting/sla" className="rounded-md px-3 py-1.5 font-medium text-ink-2 hairline hover:bg-surface-2">SLA performance</Link>
              <a href="/api/activity.csv" className="rounded-md px-3 py-1.5 font-medium text-ink-2 hairline hover:bg-surface-2">Export activity CSV</a>
            </div>
          </div>

          <section className="panel p-5">
            <div className="mb-3 flex items-baseline justify-between">
              <h2 className="text-[14px] font-semibold">Volume by month</h2>
              <span className="flex gap-3 text-[12px] text-ink-3"><span className="flex items-center gap-1.5"><i className="size-2 rounded-sm bg-accent" /> Created</span><span className="flex items-center gap-1.5"><i className="size-2 rounded-sm bg-ok" /> Resolved</span></span>
            </div>
            <Bars data={monthly.map((m) => [m.created, m.resolved] as [number, number])} labels={monthly.map((m) => m.label)} color="var(--accent)" color2="var(--ok)" height={170} width={900} />
            <div className="mt-3 grid grid-cols-12 gap-1 text-center text-[10.5px] text-ink-3">
              {monthly.map((m) => (
                <span key={m.label} className="tnum">{m.median_hours ? `${Math.round(m.median_hours)}h` : "—"}</span>
              ))}
            </div>
            <p className="mt-1 text-center text-[11px] text-ink-4">Median time to resolve, per month</p>
          </section>

          <div className="grid gap-4 lg:grid-cols-2">
            <section className="panel overflow-hidden">
              <div className="px-4 py-3 hairline-b"><h2 className="text-[14px] font-semibold">By team</h2></div>
              <table className="w-full text-[13px]">
                <thead><tr className="text-left [&>th]:h-8 [&>th]:px-4"><th className="label">Team</th><th className="label text-right">Open</th><th className="label text-right">Resolved · 30d</th><th className="label text-right">Median · 90d</th></tr></thead>
                <tbody>
                  {byTeam.map((t) => (
                    <tr key={t.name ?? "none"} className="hairline-t">
                      <td className="px-4 py-2">{t.name ?? "Unassigned"}</td>
                      <td className="tnum px-4 py-2 text-right font-medium">{t.open}</td>
                      <td className="tnum px-4 py-2 text-right">{t.resolved30}</td>
                      <td className="tnum px-4 py-2 text-right text-ink-2">{t.median ? `${Math.round(t.median)}h` : "—"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </section>
            <section className="panel overflow-hidden">
              <div className="px-4 py-3 hairline-b"><h2 className="text-[14px] font-semibold">By category · 90d</h2></div>
              <table className="w-full text-[13px]">
                <thead><tr className="text-left [&>th]:h-8 [&>th]:px-4"><th className="label">Category</th><th className="label text-right">Tickets</th><th className="label text-right">Within SLA</th></tr></thead>
                <tbody>
                  {byCategory.map((c) => (
                    <tr key={c.name ?? "none"} className="hairline-t">
                      <td className="px-4 py-2">{c.name ?? "Uncategorised"}</td>
                      <td className="tnum px-4 py-2 text-right font-medium">{c.n}</td>
                      <td className={cn("tnum px-4 py-2 text-right", Number(c.pct) < 0.8 ? "text-crit" : Number(c.pct) < 0.95 ? "text-warn" : "text-ok")}>{pct(Number(c.pct))}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </section>
          </div>

          <div className="grid gap-4 lg:grid-cols-3">
            <section className="panel p-5">
              <h2 className="mb-3 text-[14px] font-semibold">Time to resolve</h2>
              <ul className="space-y-2">
                {buckets.map((b) => (
                  <li key={b.label} className="grid grid-cols-[56px_1fr_36px] items-center gap-2 text-[13px]">
                    <span className="tnum text-ink-2">{b.label}</span>
                    <span className="bar"><i style={{ width: `${(b.n / maxBucket) * 100}%` }} /></span>
                    <span className="tnum text-right text-ink-3">{b.n}</span>
                  </li>
                ))}
              </ul>
            </section>
            <section className="panel p-5">
              <h2 className="mb-3 text-[14px] font-semibold">Requests by department · 90d</h2>
              <ul className="space-y-2">
                {byDept.map((d) => (
                  <li key={d.name ?? "none"} className="grid grid-cols-[120px_1fr_36px] items-center gap-2 text-[13px]">
                    <span className="truncate text-ink-2">{d.name ?? "—"}</span>
                    <span className="bar"><i style={{ width: `${(Number(d.n) / maxDept) * 100}%`, background: "var(--violet)" }} /></span>
                    <span className="tnum text-right text-ink-3">{d.n}</span>
                  </li>
                ))}
              </ul>
            </section>
            <section className="panel p-5">
              <h2 className="mb-3 text-[14px] font-semibold">Channel and satisfaction</h2>
              <div className="flex items-center gap-4">
                <Donut segments={byChannel.map((c) => ({ value: Number(c.n), color: colors[c.source] ?? "var(--ink-4)" }))} size={96} thickness={12} />
                <ul className="space-y-1 text-[12.5px]">
                  {byChannel.map((c) => (
                    <li key={c.source} className="flex items-center gap-2 capitalize"><i className="size-2 rounded-sm" style={{ background: colors[c.source] }} /> {c.source} <span className="tnum text-ink-3">{pct(Number(c.n) / channelTotal)}</span></li>
                  ))}
                </ul>
              </div>
              <div className="mt-4">
                <p className="label mb-1.5">CSAT distribution</p>
                <div className="flex h-2 overflow-hidden rounded-full bg-surface-3">
                  {csat.map((c) => (
                    <span key={c.score} style={{ width: `${(Number(c.n) / csatTotal) * 100}%`, background: Number(c.score) >= 4 ? "var(--ok)" : Number(c.score) === 3 ? "var(--warn)" : "var(--crit)" }} />
                  ))}
                </div>
                <p className="mt-1.5 text-[11.5px] text-ink-3">{csatTotal} ratings · {pct(csat.filter((c) => Number(c.score) >= 4).reduce((s, c) => s + Number(c.n), 0) / csatTotal)} rated 4 or 5</p>
              </div>
            </section>
          </div>
        </div>
      </div>
    </>
  );
}
