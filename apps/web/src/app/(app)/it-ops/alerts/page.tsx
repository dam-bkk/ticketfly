import Link from "next/link";
import { ackAlert, alertToIncident, resolveAlert } from "@/app/module-actions";
import { ackAllNew } from "./actions";
import { requireStaff } from "@/lib/auth";
import { listAlerts } from "@/lib/modules";
import { cn, relTime } from "@/lib/utils";
import { Topbar } from "@/components/shell/topbar";
import { Button } from "@/components/ui/button";
import { Empty } from "@/components/ui/empty";
import { Tone } from "@/components/ui/pills";

export const metadata = { title: "Alerts" };

const SOURCE: Record<string, string> = { defender: "Defender", azure_monitor: "Azure Monitor", intune: "Intune" };

export default async function AlertsPage({ searchParams }: { searchParams: Promise<{ s?: string }> }) {
  await requireStaff();
  const { s = "" } = await searchParams;
  const { rows, k } = await listAlerts(s || undefined);
  const newIds = rows.filter(({ a }) => a.status === "new").map(({ a }) => a.id);
  return (
    <>
      <Topbar crumbs={[{ label: "IT Operations" }, { label: "Alerts" }]} />
      <div className="flex h-11 shrink-0 items-center gap-1 bg-surface px-3 hairline-b">
        {[["", "All"], ["new", "New"], ["acknowledged", "Acknowledged"], ["resolved", "Resolved"]].map(([key, label]) => (
          <Link key={key} href={`/it-ops/alerts${key ? `?s=${key}` : ""}`} className={cn("h-7 rounded-md px-2.5 text-[12.5px] font-medium leading-7 text-ink-2 hover:bg-surface-2 hover:text-ink", s === key && "bg-surface-2 text-ink")}>
            {label}
          </Link>
        ))}
        <span className="ml-auto flex items-center gap-4 text-[12.5px] text-ink-3">
          <span><strong className={cn("tnum font-semibold", k.newCount && "text-warn")}>{k.newCount}</strong> new</span>
          <span><strong className={cn("tnum font-semibold", k.high && "text-crit")}>{k.high}</strong> high, unresolved</span>
          <span><strong className="tnum font-semibold">{k.resolved7}</strong> resolved · 7d</span>
          {newIds.length > 0 && (
            <form action={ackAllNew.bind(null, newIds)}>
              <Button type="submit" size="sm" variant="primary">Acknowledge all new · {newIds.length}</Button>
            </form>
          )}
        </span>
      </div>
      <div className="flex-1 overflow-y-auto">
        <div className="mx-auto max-w-[1100px] px-6 py-5 rise">
          <p className="mb-4 text-[13.5px] text-ink-3">Signals from Defender, Intune and Azure Monitor.</p>
          {rows.length === 0 ? <Empty title="No alerts" /> : (
            <ul className="space-y-2">
              {rows.map(({ a, ticketSubject }) => (
                <li key={a.id} className={cn("panel flex items-start gap-4 p-4", a.status === "resolved" && "opacity-70")}>
                  <span className={cn("mt-1.5 size-2.5 shrink-0 rounded-full", a.severity === "high" ? "bg-crit" : a.severity === "medium" ? "bg-warn" : "bg-info")} title={`${a.severity} severity`} />
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-[13.5px] font-medium">{a.title}</span>
                      <Tone tone={a.status === "new" ? "warn" : a.status === "acknowledged" ? "info" : "ok"} className="capitalize">{a.status}</Tone>
                      <span className="text-[12.5px] text-ink-3">{SOURCE[a.source] ?? a.source} · {a.resource} · fired {relTime(a.firedAt)}</span>
                    </div>
                    {a.detail && <p className="mt-1 text-[13.5px] text-ink-2">{a.detail}</p>}
                    {a.ticketId && (
                      <p className="mt-1.5 text-[12.5px]">
                        Incident: <Link href={`/tickets/${a.ticketId}`} className="font-medium text-accent-ink hover:underline">{ticketSubject}</Link>
                      </p>
                    )}
                  </div>
                  {/* Fixed-width actions cell: the pending step is outlined, the rest are ghost. */}
                  <div className="flex w-[220px] shrink-0 items-center justify-end gap-1">
                    {a.status === "resolved" ? (
                      <span className="text-[12.5px] text-ink-3">Resolved {a.resolvedAt ? relTime(a.resolvedAt) : ""}</span>
                    ) : (
                      <>
                        {a.status === "new" && <form action={ackAlert.bind(null, a.id)}><Button type="submit" size="sm" variant="secondary">Acknowledge</Button></form>}
                        {!a.ticketId && <form action={alertToIncident.bind(null, a.id)}><Button type="submit" size="sm" variant={a.status === "new" ? "ghost" : "secondary"}>Create incident</Button></form>}
                        <form action={resolveAlert.bind(null, a.id)}><Button type="submit" size="sm" variant={a.status === "acknowledged" && a.ticketId ? "secondary" : "ghost"}>Resolve</Button></form>
                      </>
                    )}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </>
  );
}
