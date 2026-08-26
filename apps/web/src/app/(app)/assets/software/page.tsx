import { requireStaff } from "@/lib/auth";
import { softwareEstate } from "@/lib/queries";
import { cn, money } from "@/lib/utils";
import { Topbar } from "@/components/shell/topbar";
import { Tone } from "@/components/ui/pills";

export const metadata = { title: "Software" };

export default async function SoftwarePage() {
  await requireStaff();
  const estate = await softwareEstate();
  const licensedSpend = estate.reduce((a, s) => a + Number(s.unitMonthlyCost) * Math.min(s.installs, s.seatsOwned ?? s.installs), 0);
  const unlicensed = estate.filter((s) => s.licenceModel === "unlicensed").reduce((a, s) => a + s.installs, 0);
  const overSeat = estate.filter((s) => s.seatsOwned && s.installs > s.seatsOwned);

  return (
    <>
      <Topbar crumbs={[{ label: "Assets" }, { label: "Software" }]} />
      <div className="flex-1 overflow-y-auto">
        <div className="mx-auto max-w-[1180px] px-6 py-6 rise">
          <div>
            <h1 className="text-[20px] font-semibold tracking-[-0.01em]">Software</h1>
            <p className="text-[13px] text-ink-3">Every title detected by Defender across all devices, normalised, with installs against seats owned.</p>
          </div>
              <div className="mt-6 grid gap-3 md:grid-cols-3">
                <Stat label="Titles detected" value={estate.length} sub="normalised across devices" />
                <Stat label="Unlicensed installs" value={unlicensed} sub="TeamViewer, Grammarly and similar" tone={unlicensed ? "warn" : "ok"} />
                <Stat label="Over seat count" value={overSeat.length} sub={overSeat.map((s) => s.name).join(", ") || "none"} tone={overSeat.length ? "crit" : "ok"} />
              </div>
              <div className="panel mt-3 overflow-hidden">
                <table className="w-full text-[13px]">
                  <thead>
                    <tr className="text-left [&>th]:h-9 [&>th]:px-3 [&>th]:font-medium">
                      <th className="label">Software</th>
                      <th className="label">Category</th>
                      <th className="label">Licence</th>
                      <th className="label text-right">Installs</th>
                      <th className="label text-right">Seats</th>
                      <th className="label">Versions</th>
                      <th className="label text-right">Monthly</th>
                    </tr>
                  </thead>
                  <tbody>
                    {estate.map((s) => {
                      const versions = s.versions as { version: string; n: number }[];
                      const over = s.seatsOwned && s.installs > s.seatsOwned;
                      return (
                        <tr key={s.id} className="row hairline-t">
                          <td className="px-3 py-2">
                            <span className="block font-medium">{s.name}</span>
                            <span className="text-[11.5px] text-ink-3">{s.vendor}</span>
                          </td>
                          <td className="px-3 py-2 text-ink-2">{s.category}</td>
                          <td className="px-3 py-2">{s.licenceModel === "unlicensed" ? <Tone tone="warn">Unlicensed</Tone> : <span className="capitalize text-ink-2">{s.licenceModel}</span>}</td>
                          <td className="tnum px-3 py-2 text-right font-medium">{s.installs}</td>
                          <td className={cn("tnum px-3 py-2 text-right", over ? "font-medium text-crit" : "text-ink-2")}>{s.seatsOwned ?? "—"}</td>
                          <td className="px-3 py-2">
                            <span className="flex items-center gap-1">
                              {versions.slice(0, 3).map((v, i) => (
                                <span key={v.version} className={cn("rounded px-1.5 py-0.5 font-mono text-[10.5px]", i === 0 ? "bg-accent-soft text-accent-ink" : "bg-surface-2 text-ink-3")} title={`${v.n} installs`}>
                                  {v.version} <span className="opacity-70">×{v.n}</span>
                                </span>
                              ))}
                            </span>
                          </td>
                          <td className="tnum px-3 py-2 text-right text-ink-2">{Number(s.unitMonthlyCost) ? money(Number(s.unitMonthlyCost) * Math.min(s.installs, s.seatsOwned ?? s.installs)) : "—"}</td>
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

function Stat({ label, value, sub, tone }: { label: string; value: number | string; sub?: string; tone?: "ok" | "warn" | "crit" }) {
  return (
    <div className="panel p-4">
      <p className="label">{label}</p>
      <p className={cn("tnum mt-2 text-[22px] font-semibold leading-none tracking-[-0.02em]", tone === "crit" && "text-crit", tone === "warn" && "text-warn", tone === "ok" && "text-ok")}>{value}</p>
      {sub && <p className="mt-1.5 truncate text-[11.5px] text-ink-3">{sub}</p>}
    </div>
  );
}
