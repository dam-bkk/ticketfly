import Link from "next/link";
import { notFound } from "next/navigation";
import { requireStaff } from "@/lib/auth";
import { getAsset } from "@/lib/queries";
import { longTime, money, relTime } from "@/lib/utils";
import { Topbar } from "@/components/shell/topbar";
import { Avatar } from "@/components/ui/avatar";
import { StatusDot, Tone } from "@/components/ui/pills";

export default async function AssetPage({ params }: { params: Promise<{ id: string }> }) {
  await requireStaff();
  const { id } = await params;
  const data = await getAsset(Number(id));
  if (!data) notFound();
  const { a, owner, software, tickets } = data;
  const monthly = software.reduce((s, x) => s + Number(x.cost), 0);
  return (
    <>
      <Topbar crumbs={[{ label: "Assets", href: "/assets" }, { label: a.assetTag }]} />
      <div className="flex-1 overflow-y-auto">
        <div className="mx-auto max-w-[1100px] px-6 py-6 rise">
          <div className="flex items-start justify-between gap-6">
            <div>
              <p className="font-mono text-[12px] text-ink-3">{a.assetTag} · {a.serial}</p>
              <h1 className="mt-1 text-[22px] font-semibold tracking-[-0.01em]">{a.model ?? a.name}</h1>
              <div className="mt-2 flex items-center gap-2">
                {a.compliance === "compliant" ? <Tone tone="ok">Compliant</Tone> : a.compliance === "non_compliant" ? <Tone tone="crit">Non-compliant</Tone> : <Tone tone="neutral">Unknown</Tone>}
                <Tone tone="neutral" className="capitalize">{a.status.replace("_", " ")}</Tone>
                <Tone tone="neutral" className="capitalize">{a.source}</Tone>
              </div>
            </div>
            {owner && (
              <Link href={`/people/${owner.id}`} className="panel flex items-center gap-3 p-3 pr-5 hover:shadow-2">
                <Avatar name={owner.displayName} size={36} />
                <span>
                  <span className="block text-[13.5px] font-medium">{owner.displayName}</span>
                  <span className="block text-[12px] text-ink-3">{owner.jobTitle} · {owner.officeLocation}</span>
                </span>
              </Link>
            )}
          </div>

          <div className="mt-6 grid gap-4 lg:grid-cols-[1fr_1fr_1fr]">
            <Card title="Signals">
              <Dl rows={[["Last seen", a.lastSeenAt ? `${relTime(a.lastSeenAt)} · ${longTime(a.lastSeenAt)}` : "—"], ["Location", a.lastSeenCity ? `${a.lastSeenCity} (${a.lastSeenCountry})` : "—"], ["IP", a.lastSeenIp ?? "—"], ["Encryption", a.encrypted === null ? "—" : a.encrypted ? "BitLocker / FileVault on" : "Off"], ["OS", a.os ? `${a.os} ${a.osVersion ?? ""}` : "—"]]} />
              <p className="mt-3 text-[11.5px] text-ink-4">Location is last sign-in city from Log Analytics, not GPS.</p>
            </Card>
            <Card title="Lifecycle">
              <Dl rows={[["Purchased", a.purchaseDate ?? "—"], ["Cost", a.cost ? money(a.cost) : "—"], ["Type", a.type], ["Source", a.source], ["Warranty", a.purchaseDate ? `${a.purchaseDate.slice(0, 4) === "2026" ? "In warranty" : "Check vendor"}` : "—"]]} />
            </Card>
            <Card title="Software cost on this device">
              <p className="tnum text-[26px] font-semibold tracking-[-0.02em]">{money(monthly)}<span className="text-[13px] font-normal text-ink-3"> / month</span></p>
              <p className="mt-1 text-[12px] text-ink-3">{software.length} titles · {software.filter((s) => s.licenceModel === "unlicensed").length} unlicensed</p>
            </Card>
          </div>

          <section className="panel mt-4 overflow-hidden">
            <div className="flex items-center justify-between px-4 py-3 hairline-b">
              <h2 className="text-[14px] font-semibold">Installed software</h2>
              <span className="text-[12px] text-ink-3">from Defender inventory</span>
            </div>
            <table className="w-full text-[13px]">
              <tbody>
                {software.map((s) => (
                  <tr key={s.name} className="row hairline-b last:shadow-none">
                    <td className="px-4 py-2 font-medium">{s.name}</td>
                    <td className="px-4 py-2 text-ink-3">{s.vendor}</td>
                    <td className="px-4 py-2 text-ink-3">{s.category}</td>
                    <td className="px-4 py-2 font-mono text-[11.5px] text-ink-2">{s.version}</td>
                    <td className="px-4 py-2">{s.licenceModel === "unlicensed" ? <Tone tone="warn">Unlicensed</Tone> : <span className="capitalize text-ink-3">{s.licenceModel}</span>}</td>
                    <td className="tnum px-4 py-2 text-right text-ink-3">{relTime(s.detectedAt)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </section>

          {tickets.length > 0 && (
            <section className="panel mt-4 overflow-hidden">
              <div className="px-4 py-3 hairline-b">
                <h2 className="text-[14px] font-semibold">Owner&apos;s recent tickets</h2>
              </div>
              <ul>
                {tickets.map((t) => (
                  <li key={t.id} className="row hairline-b last:shadow-none">
                    <Link href={`/tickets/${t.id}`} className="flex items-center gap-3 px-4 py-2.5 text-[13px]">
                      <StatusDot status={t.status} />
                      <span className="flex-1 truncate">{t.subject}</span>
                      <span className="text-[12px] text-ink-4">{relTime(t.createdAt)}</span>
                    </Link>
                  </li>
                ))}
              </ul>
            </section>
          )}
        </div>
      </div>
    </>
  );
}

function Card({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="panel p-4">
      <p className="label mb-3">{title}</p>
      {children}
    </section>
  );
}
function Dl({ rows }: { rows: [string, string][] }) {
  return (
    <dl className="space-y-1.5 text-[13px]">
      {rows.map(([k, v]) => (
        <div key={k} className="flex justify-between gap-3">
          <dt className="text-ink-3">{k}</dt>
          <dd className="truncate text-right capitalize">{v}</dd>
        </div>
      ))}
    </dl>
  );
}
