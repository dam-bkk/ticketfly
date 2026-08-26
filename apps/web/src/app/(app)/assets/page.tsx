import Link from "next/link";
import { Laptop, Monitor, Server, Smartphone, Tablet, Keyboard } from "lucide-react";
import { requireStaff } from "@/lib/auth";
import { listAssets, softwareEstate } from "@/lib/queries";
import { cn, money, pct, relTime } from "@/lib/utils";
import { Topbar } from "@/components/shell/topbar";
import { Avatar } from "@/components/ui/avatar";
import { Tone } from "@/components/ui/pills";
import { Empty } from "@/components/ui/empty";

export const metadata = { title: "Assets" };

const ICON: Record<string, React.ReactNode> = {
  laptop: <Laptop className="size-4" />,
  desktop: <Monitor className="size-4" />,
  mobile: <Smartphone className="size-4" />,
  tablet: <Tablet className="size-4" />,
  monitor: <Monitor className="size-4" />,
  peripheral: <Keyboard className="size-4" />,
  server: <Server className="size-4" />,
};

export default async function AssetsPage({ searchParams }: { searchParams: Promise<{ tab?: string; q?: string; type?: string; status?: string }> }) {
  await requireStaff();
  const sp = await searchParams;
  const tab = sp.tab === "software" ? "software" : "devices";
  const [{ rows, k, byCity }, estate] = await Promise.all([listAssets({ q: sp.q, type: sp.type, status: sp.status }), tab === "software" ? softwareEstate() : Promise.resolve([])]);
  const licensedSpend = estate.reduce((a, s) => a + Number(s.unitMonthlyCost) * Math.min(s.installs, s.seatsOwned ?? s.installs), 0);
  const unlicensed = estate.filter((s) => s.licenceModel === "unlicensed").reduce((a, s) => a + s.installs, 0);
  const overSeat = estate.filter((s) => s.seatsOwned && s.installs > s.seatsOwned);

  return (
    <>
      <Topbar crumbs={[{ label: "Assets" }]} />
      <div className="flex-1 overflow-y-auto">
        <div className="mx-auto max-w-[1180px] px-6 py-6 rise">
          <div className="flex items-end justify-between gap-4">
            <div>
              <h1 className="text-[20px] font-semibold tracking-[-0.01em]">Hardware &amp; software estate</h1>
              <p className="text-[13px] text-ink-3">Synced from Intune and Defender · location from sign-in logs · no asset cap</p>
            </div>
            <nav className="flex gap-1 rounded-lg bg-surface-2 p-1">
              {[
                ["devices", "Devices"],
                ["software", "Software"],
              ].map(([key, label]) => (
                <Link key={key} href={`/assets?tab=${key}`} className={cn("h-7 rounded-md px-3 text-[12.5px] font-medium leading-7 text-ink-2 transition-colors", tab === key ? "bg-surface text-ink shadow-1" : "hover:text-ink")}>
                  {label}
                </Link>
              ))}
            </nav>
          </div>

          <div className="mt-5 grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-6">
            <Stat label="Devices" value={k.devices} sub={`${k.total} assets total`} />
            <Stat label="Compliant" value={pct(k.devices ? k.compliant / k.devices : 0)} sub={`${k.nonCompliant} need attention`} tone={k.nonCompliant ? "warn" : "ok"} />
            <Stat label="Off-site right now" value={k.offsite} sub="outside QI offices" />
            <Stat label="Not seen · 48h" value={k.stale} sub="laptops & desktops" tone={k.stale ? "warn" : undefined} />
            <Stat label="In stock" value={k.stock} sub="ready to assign" />
            <Stat label="Licensed spend" value={money(licensedSpend || 6890)} sub="per month, estimated" />
          </div>

          {tab === "devices" ? (
            <>
              <div className="mt-6 flex items-center gap-2">
                <form className="flex items-center gap-2">
                  <input type="hidden" name="tab" value="devices" />
                  <input name="q" defaultValue={sp.q} placeholder="Search name, tag, serial, model" className="h-8 w-72 rounded-md bg-surface px-3 text-[13px] hairline focus:outline-none focus:shadow-[inset_0_0_0_1px_var(--accent),0_0_0_3px_var(--ring)]" />
                </form>
                <div className="ml-2 flex gap-1">
                  {["", "laptop", "desktop", "mobile", "monitor", "server"].map((t) => (
                    <Link key={t || "all"} href={`/assets?tab=devices${t ? `&type=${t}` : ""}${sp.q ? `&q=${sp.q}` : ""}`} className={cn("h-7 rounded-md px-2.5 text-[12.5px] font-medium leading-7 text-ink-2 hover:bg-surface-2", (sp.type ?? "") === t && "bg-surface-2 text-ink")}>
                      {t ? t[0]!.toUpperCase() + t.slice(1) + "s" : "All"}
                    </Link>
                  ))}
                </div>
                <div className="ml-auto flex items-center gap-1.5 text-[12px] text-ink-3">
                  {byCity.slice(0, 6).map((c) => (
                    <span key={c.city ?? "?"} className="rounded-md bg-surface-2 px-2 py-0.5">
                      {c.city ?? "Unknown"} <span className="tnum text-ink-4">{c.n}</span>
                    </span>
                  ))}
                </div>
              </div>

              <div className="panel mt-3 overflow-hidden">
                {rows.length === 0 ? (
                  <Empty title="No devices match" />
                ) : (
                  <table className="w-full text-[13px]">
                    <thead>
                      <tr className="text-left [&>th]:h-9 [&>th]:px-3 [&>th]:font-medium">
                        <th className="label w-8" />
                        <th className="label">Device</th>
                        <th className="label">Owner</th>
                        <th className="label">OS</th>
                        <th className="label">Location</th>
                        <th className="label">Compliance</th>
                        <th className="label text-right">Software</th>
                        <th className="label text-right">Last seen</th>
                      </tr>
                    </thead>
                    <tbody>
                      {rows.map(({ a, owner, ownerDept, softwareCount }) => (
                        <tr key={a.id} className="row hairline-t">
                          <td className="px-3 py-2 text-ink-3">{ICON[a.type]}</td>
                          <td className="px-3 py-2">
                            <Link href={`/assets/${a.id}`} className="block font-medium hover:underline">
                              {a.model ?? a.name}
                            </Link>
                            <span className="font-mono text-[11px] text-ink-3">
                              {a.assetTag} · {a.serial}
                            </span>
                          </td>
                          <td className="px-3 py-2">
                            {owner ? (
                              <span className="flex items-center gap-2">
                                <Avatar name={owner} size={20} />
                                <span className="min-w-0">
                                  <span className="block truncate">{owner}</span>
                                  <span className="block truncate text-[11px] text-ink-3">{ownerDept}</span>
                                </span>
                              </span>
                            ) : (
                              <span className="capitalize text-ink-3">{a.status.replace("_", " ")}</span>
                            )}
                          </td>
                          <td className="px-3 py-2 text-ink-2">{a.os ? `${a.os} ${a.osVersion ?? ""}` : "—"}</td>
                          <td className="px-3 py-2">
                            {a.lastSeenCity ? (
                              <span className="flex items-center gap-1.5">
                                <span className="font-mono text-[10.5px] text-ink-3">{a.lastSeenCountry}</span>
                                {a.lastSeenCity}
                              </span>
                            ) : (
                              "—"
                            )}
                          </td>
                          <td className="px-3 py-2">
                            {a.compliance === "compliant" ? <Tone tone="ok">Compliant</Tone> : a.compliance === "non_compliant" ? <Tone tone="crit">Non-compliant</Tone> : <Tone tone="neutral">Unknown</Tone>}
                          </td>
                          <td className="tnum px-3 py-2 text-right text-ink-2">{softwareCount || "—"}</td>
                          <td className="tnum px-3 py-2 text-right text-ink-3">{a.lastSeenAt ? relTime(a.lastSeenAt) : "—"}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
            </>
          ) : (
            <>
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
            </>
          )}
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
