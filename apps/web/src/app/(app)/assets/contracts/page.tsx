import { differenceInCalendarDays } from "date-fns";
import { requireStaff } from "@/lib/auth";
import { listContracts } from "@/lib/assets";
import { cn, money } from "@/lib/utils";
import { Topbar } from "@/components/shell/topbar";
import { Avatar } from "@/components/ui/avatar";
import { Tone } from "@/components/ui/pills";

export const metadata = { title: "Contracts" };

export default async function ContractsPage() {
  await requireStaff();
  const rows = await listContracts();
  const annual = rows.filter((r) => r.c.status !== "expired").reduce((s, r) => s + Number(r.c.cost), 0);
  const expiring = rows.filter((r) => r.c.status === "expiring" || (r.c.status === "active" && differenceInCalendarDays(new Date(r.c.endDate), new Date()) < 90));
  return (
    <>
      <Topbar crumbs={[{ label: "Assets" }, { label: "Contracts" }]} />
      <div className="flex-1 overflow-y-auto">
        <div className="mx-auto max-w-[1180px] px-6 py-6 rise">
          <div className="flex items-end justify-between">
            <div>
              <h1 className="text-[20px] font-semibold tracking-[-0.01em]">Contracts</h1>
              <p className="text-[13px] text-ink-3">Software, warranty and maintenance agreements with renewal alerts at 90 days.</p>
            </div>
            <div className="flex gap-3">
              <div className="panel px-4 py-2.5 text-right">
                <p className="label">Committed / year</p>
                <p className="tnum text-[18px] font-semibold">{money(annual)}</p>
              </div>
              <div className="panel px-4 py-2.5 text-right">
                <p className="label">Renewing · 90d</p>
                <p className={cn("tnum text-[18px] font-semibold", expiring.length && "text-warn")}>{expiring.length}</p>
              </div>
            </div>
          </div>
          <div className="panel mt-5 overflow-hidden">
            <table className="w-full text-[13px]">
              <thead>
                <tr className="text-left [&>th]:h-9 [&>th]:px-3">
                  <th className="label">Contract</th>
                  <th className="label">Vendor</th>
                  <th className="label">Type</th>
                  <th className="label">Term</th>
                  <th className="label">Status</th>
                  <th className="label text-right">Licences</th>
                  <th className="label text-right">Cost</th>
                  <th className="label">Owner</th>
                </tr>
              </thead>
              <tbody>
                {rows.map(({ c, owner }) => {
                  const days = differenceInCalendarDays(new Date(c.endDate), new Date());
                  return (
                    <tr key={c.id} className="row hairline-t">
                      <td className="px-3 py-2">
                        <span className="block font-medium text-accent-ink">{c.name}</span>
                        {c.notes && <span className="text-[11.5px] text-ink-3">{c.notes}</span>}
                      </td>
                      <td className="px-3 py-2 text-ink-2">{c.vendor}</td>
                      <td className="px-3 py-2 capitalize text-ink-2">{c.type}</td>
                      <td className="tnum px-3 py-2 text-ink-2">
                        {c.startDate} → {c.endDate}
                        <span className={cn("ml-2 text-[11.5px]", days < 0 ? "text-ink-3" : days < 90 ? "text-warn" : "text-ink-3")}>{days < 0 ? "ended" : `${days}d`}</span>
                      </td>
                      <td className="px-3 py-2">
                        <Tone tone={c.status === "active" ? "ok" : c.status === "expiring" ? "warn" : "neutral"} className="capitalize">
                          {c.status}
                        </Tone>
                      </td>
                      <td className="tnum px-3 py-2 text-right text-ink-2">{c.licences ?? "—"}</td>
                      <td className="tnum px-3 py-2 text-right font-medium">
                        {money(c.cost)} <span className="text-[11px] font-normal text-ink-3">/{c.billing === "annual" ? "yr" : c.billing}</span>
                      </td>
                      <td className="px-3 py-2">{owner ? <span className="flex items-center gap-2"><Avatar name={owner} size={20} />{owner}</span> : "—"}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </>
  );
}
