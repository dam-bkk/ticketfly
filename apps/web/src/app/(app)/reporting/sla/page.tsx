import Link from "next/link";
import { requireStaff } from "@/lib/auth";
import { slaReport } from "@/lib/modules";
import { cn, pct, PRIORITY_LABEL } from "@/lib/utils";
import { Topbar } from "@/components/shell/topbar";
import { Avatar } from "@/components/ui/avatar";
import { PriorityMark } from "@/components/ui/pills";
import { Bars } from "@/components/ui/sparkline";

export const metadata = { title: "SLA performance" };

export default async function SlaReportPage() {
  await requireStaff();
  const { byPriority, weekly, breaches } = await slaReport();
  const totalMet = byPriority.reduce((s, p) => s + p.met, 0);
  const totalRes = byPriority.reduce((s, p) => s + p.resolved, 0) || 1;
  return (
    <>
      <Topbar crumbs={[{ label: "Reporting", href: "/reporting" }, { label: "SLA performance" }]} />
      <div className="flex-1 overflow-y-auto">
        <div className="mx-auto max-w-[1100px] space-y-5 px-6 py-6 rise">
          <div className="flex items-end justify-between">
            <div>
              <h1 className="text-[20px] font-semibold tracking-[-0.01em]">SLA performance</h1>
              <p className="text-[13px] text-ink-3">Last 90 days, business hours, paused time excluded. Target 95%.</p>
            </div>
            <div className="panel px-4 py-2.5 text-right">
              <p className="label">Resolution within SLA</p>
              <p className={cn("tnum text-[22px] font-semibold", totalMet / totalRes >= 0.95 ? "text-ok" : totalMet / totalRes >= 0.8 ? "text-warn" : "text-crit")}>{pct(totalMet / totalRes)}</p>
            </div>
          </div>
          <section className="panel overflow-hidden">
            <table className="w-full text-[13px]">
              <thead><tr className="text-left [&>th]:h-9 [&>th]:px-4"><th className="label">Priority</th><th className="label text-right">Resolved</th><th className="label text-right">Within SLA</th><th className="label">Attainment</th><th className="label text-right">First response</th><th className="label text-right">Open · breached</th><th className="label text-right">Paused</th></tr></thead>
              <tbody>
                {byPriority.map((p) => {
                  const att = p.resolved ? p.met / p.resolved : 0;
                  const fr = p.frTotal ? p.frMet / p.frTotal : 0;
                  return (
                    <tr key={p.priority} className="hairline-t">
                      <td className="px-4 py-2.5"><PriorityMark priority={p.priority} withLabel /></td>
                      <td className="tnum px-4 py-2.5 text-right">{p.resolved}</td>
                      <td className="tnum px-4 py-2.5 text-right">{p.met}</td>
                      <td className="px-4 py-2.5">
                        <span className="flex items-center gap-2">
                          <span className="bar w-40"><i style={{ width: `${att * 100}%`, background: att >= 0.95 ? "var(--ok)" : att >= 0.8 ? "var(--warn)" : "var(--crit)" }} /></span>
                          <span className={cn("tnum text-[12.5px] font-medium", att >= 0.95 ? "text-ok" : att >= 0.8 ? "text-warn" : "text-crit")}>{pct(att)}</span>
                        </span>
                      </td>
                      <td className={cn("tnum px-4 py-2.5 text-right", fr >= 0.95 ? "text-ok" : fr >= 0.8 ? "text-warn" : "text-crit")}>{pct(fr)}</td>
                      <td className={cn("tnum px-4 py-2.5 text-right", p.openBreached && "font-medium text-crit")}>{p.openBreached}</td>
                      <td className="tnum px-4 py-2.5 text-right text-ink-3">{p.paused}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </section>
          <section className="panel p-5">
            <div className="mb-3 flex items-baseline justify-between">
              <h2 className="text-[14px] font-semibold">Weekly attainment</h2>
              <span className="flex gap-3 text-[12px] text-ink-3"><span className="flex items-center gap-1.5"><i className="size-2 rounded-sm bg-ink-4" /> Resolved</span><span className="flex items-center gap-1.5"><i className="size-2 rounded-sm bg-ok" /> Within SLA</span></span>
            </div>
            <Bars data={weekly.map((w) => [w.total, w.met] as [number, number])} labels={weekly.map((w) => w.label)} color="var(--ink-4)" color2="var(--ok)" height={150} width={900} />
          </section>
          <section className="panel overflow-hidden">
            <div className="flex items-center justify-between px-4 py-3 hairline-b">
              <h2 className="text-[14px] font-semibold">Open tickets past resolution target</h2>
              <Link href="/tickets?f=at_risk" className="text-[12.5px] font-medium text-accent-ink hover:underline">Open the queue</Link>
            </div>
            {breaches.length === 0 ? <p className="px-4 py-6 text-[13px] text-ink-3">None. </p> : (
              <ul className="divide-y divide-line">
                {breaches.map((b) => (
                  <li key={b.id} className="flex items-center gap-3 px-4 py-2.5 text-[13px]">
                    <PriorityMark priority={b.priority} />
                    <Link href={`/tickets/${b.id}`} className="min-w-0 flex-1 truncate font-medium text-accent-ink hover:underline">{b.subject}</Link>
                    <span className="text-[12px] text-ink-3">{b.group}</span>
                    {b.assignee ? <span className="flex items-center gap-1.5 text-[12px] text-ink-3"><Avatar name={b.assignee} size={16} /> {b.assignee}</span> : <span className="text-[12px] text-warn">Unassigned</span>}
                    <span className="tnum w-20 text-right font-medium text-crit">{Math.round(Number(b.over))}h over</span>
                  </li>
                ))}
              </ul>
            )}
          </section>
          <p className="text-[12px] text-ink-4">{PRIORITY_LABEL.urgent} runs on calendar hours (24×7); the others on Hong Kong business hours. Edit in Admin → SLA and OLA policies.</p>
        </div>
      </div>
    </>
  );
}
