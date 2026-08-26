import Link from "next/link";
import { Download, Laptop, Monitor, Plus, Server, Smartphone, Tablet, Keyboard, Upload } from "lucide-react";
import { requireStaff } from "@/lib/auth";
import { listInventory, type InventoryFilter } from "@/lib/assets";
import { workspaceContext } from "@/lib/workspace";
import { cn, relTime } from "@/lib/utils";
import { Topbar } from "@/components/shell/topbar";
import { Avatar } from "@/components/ui/avatar";
import { ButtonLink } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Empty } from "@/components/ui/empty";
import { FilterPanel } from "./filters";

export const metadata = { title: "Inventory" };

const ICON: Record<string, React.ReactNode> = {
  laptop: <Laptop className="size-4" />,
  desktop: <Monitor className="size-4" />,
  mobile: <Smartphone className="size-4" />,
  tablet: <Tablet className="size-4" />,
  monitor: <Monitor className="size-4" />,
  peripheral: <Keyboard className="size-4" />,
  server: <Server className="size-4" />,
};
const STATE_LABEL: Record<string, string> = { in_use: "In Use", in_stock: "In Stock", repair: "In Repair", retired: "Retired" };
const TYPE_LABEL: Record<string, string> = { laptop: "Laptop", desktop: "Desktop", mobile: "Mobile", tablet: "Tablet", monitor: "Monitor", peripheral: "Peripheral", server: "Server" };

export default async function InventoryPage({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  const me = await requireStaff();
  const { current } = await workspaceContext(me);
  const sp = await searchParams;
  const f: InventoryFilter = { workspace: current.slug, q: sp.q, type: sp.type, status: sp.status, location: sp.location, department: sp.department, usedBy: sp.usedBy, managedBy: sp.managedBy, impact: sp.impact, source: sp.source, page: Number(sp.page ?? 1) };
  const { rows, total, page, pageSize, facets, k } = await listInventory(f);
  const activeFilters = Object.entries(f).filter(([key, v]) => key !== "page" && key !== "workspace" && v).length;
  const qs = (patch: Record<string, string | number | undefined>) => {
    const p = new URLSearchParams();
    for (const [key, v] of Object.entries({ ...f, ...patch })) if (key !== "workspace" && v !== undefined && v !== "" && !(key === "page" && Number(v) <= 1)) p.set(key, String(v));
    const s = p.toString();
    return `/assets/inventory${s ? `?${s}` : ""}`;
  };
  const from = (page - 1) * pageSize + 1;
  const to = Math.min(page * pageSize, total);

  return (
    <>
      <Topbar
        crumbs={[{ label: "Assets" }, { label: "Inventory · All Assets" }]}
        actions={
          <>
            <ButtonLink href="/api/assets.csv" variant="ghost" size="md">
              <Download className="size-3.5" /> Export
            </ButtonLink>
            <ButtonLink href="/admin/integrations" variant="ghost" size="md">
              <Upload className="size-3.5" /> Import
            </ButtonLink>
            <ButtonLink href="/assets/inventory/new" variant="secondary" size="md">
              <Plus className="size-3.5" /> Add New
            </ButtonLink>
          </>
        }
      />
      <div className="flex min-h-0 flex-1">
        <div className="flex min-w-0 flex-1 flex-col">
          {/* Signal strip */}
          <div className="flex shrink-0 flex-wrap items-center gap-2 px-4 py-2.5 hairline-b">
            <Signal href={qs({ status: "", type: "", page: 1 })} label="Devices" value={k.devices} />
            <Signal href="/assets/inventory?q=&status=in_use" label="Non-compliant" value={k.nonCompliant} tone={k.nonCompliant ? "crit" : undefined} />
            <Signal label="Not acknowledged" value={k.unacknowledged} tone={k.unacknowledged ? "warn" : undefined} hint="Assigned, requester has not confirmed receipt" />
            <Signal label="Returned, still assigned" value={k.returnedPending} tone={k.returnedPending ? "warn" : undefined} hint="Requester reported the device back; IT to unassign" />
            <Signal label="Not seen · 48h" value={k.stale} tone={k.stale ? "warn" : undefined} />
            <Signal label="Off-site" value={k.offsite} />
            <Signal label="End of life · 6 mo" value={k.eol} tone={k.eol ? "warn" : undefined} />
            <span className="ml-auto text-[12.5px] text-ink-3">Synced from Intune · Defender · sign-in logs</span>
          </div>

          <div className="flex shrink-0 items-center gap-2 px-4 py-2">
            <form className="flex items-center gap-2">
              {Object.entries(f).map(([key, v]) => (key !== "q" && key !== "page" && key !== "workspace" && v ? <input key={key} type="hidden" name={key} value={String(v)} /> : null))}
              <Input name="q" defaultValue={f.q} placeholder="Search by name, tag, serial, model or person" className="h-8 w-[420px] text-[13.5px]" />
            </form>
            {activeFilters > 0 && (
              <Link href="/assets/inventory" className="text-[12.5px] text-ink-3 hover:text-ink">
                Clear {activeFilters} filter{activeFilters > 1 ? "s" : ""}
              </Link>
            )}
            <span className="tnum ml-auto text-[12.5px] text-ink-3">
              Showing {total ? from : 0} to {to} of {total.toLocaleString()}
            </span>
            <span className="flex gap-1">
              <Link aria-disabled={page <= 1} href={qs({ page: page - 1 })} className={cn("h-7 rounded-md px-2 text-[12.5px] leading-7 hairline hover:bg-surface-2", page <= 1 && "pointer-events-none opacity-40")}>
                ‹
              </Link>
              <Link aria-disabled={to >= total} href={qs({ page: page + 1 })} className={cn("h-7 rounded-md px-2 text-[12.5px] leading-7 hairline hover:bg-surface-2", to >= total && "pointer-events-none opacity-40")}>
                ›
              </Link>
            </span>
          </div>

          <div className="min-h-0 flex-1 overflow-auto">
            {rows.length === 0 ? (
              <Empty title="No assets match" hint="Try clearing a filter, or search by tag, serial, model or the person using it." />
            ) : (
              <table className="w-full min-w-[1100px] text-[13.5px]">
                <thead className="sticky top-0 z-10 bg-surface-2">
                  <tr className="text-left [&>th]:h-9 [&>th]:px-3">
                    <th className="label w-8" />
                    <th className="label whitespace-nowrap">Display Name</th>
                    <th className="label whitespace-nowrap">Asset Type</th>
                    <th className="label">Location</th>
                    <th className="label whitespace-nowrap">Used By</th>
                    <th className="label">Department</th>
                    <th className="label whitespace-nowrap">Managed By</th>
                    <th className="label w-[128px] whitespace-nowrap">State</th>
                    <th className="label whitespace-nowrap text-right">Last seen</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map(({ a, usedBy, usedByStatus, managedBy }) => (
                    <tr key={a.id} className="row hairline-b">
                      <td className="px-3 py-2 text-ink-3">{ICON[a.type]}</td>
                      <td className="px-3 py-2">
                        <Link href={`/assets/${a.id}`} className="block font-medium text-accent-ink hover:underline">
                          {a.hostname ?? a.name}
                        </Link>
                        <span className="font-mono text-[11px] text-ink-3">
                          {a.assetTag} · {a.model}
                        </span>
                      </td>
                      <td className="px-3 py-2 text-ink-2">{TYPE_LABEL[a.type]}</td>
                      <td className="px-3 py-2 text-ink-2">
                        {a.lastSeenCity ?? "—"}
                        {a.lastSeenCity && !["Hong Kong", "Kuala Lumpur", "Singapore", "Dubai", "Bangkok", "Manila"].includes(a.lastSeenCity) && <span className="ml-1.5 rounded bg-warn-soft px-1 text-[11px] font-medium text-warn">off-site</span>}
                      </td>
                      <td className="px-3 py-2">
                        {usedBy ? (
                          <span className="flex items-center gap-2">
                            <Avatar name={usedBy} size={20} muted={usedByStatus === "left" || usedByStatus === "offboarding"} />
                            <span className="min-w-0">
                              <span className="block truncate font-medium">
                                {usedBy}
                                {(usedByStatus === "left" || usedByStatus === "offboarding") && <span className="ml-1 text-[11px] font-normal text-ink-3">(Deactivated)</span>}
                              </span>
                              <span className="block text-[11px] text-ink-3">
                                {a.returnedAt ? <span className="text-warn">Returned — unassign</span> : a.acknowledgedAt ? "Acknowledged" : <span className="text-warn">Not acknowledged</span>}
                              </span>
                            </span>
                          </span>
                        ) : (
                          <span className="text-ink-3">—</span>
                        )}
                      </td>
                      <td className="px-3 py-2 text-ink-2">{a.department ?? "—"}</td>
                      <td className="whitespace-nowrap px-3 py-2 text-ink-2">{managedBy ?? "—"}</td>
                      <td className="whitespace-nowrap px-3 py-2">
                        <span className="flex items-center gap-1.5 whitespace-nowrap">
                          <span className={cn("size-1.5 rounded-full", a.compliance === "compliant" ? "bg-ok" : a.compliance === "non_compliant" ? "bg-crit" : "bg-ink-4")} title={a.compliance} />
                          <span className="text-ink-2">{STATE_LABEL[a.status] ?? a.status}</span>
                        </span>
                      </td>
                      <td className="tnum px-3 py-2 text-right text-ink-3">{a.lastSeenAt ? relTime(a.lastSeenAt) : "—"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
        <FilterPanel current={f} facets={{ locations: facets.locations.map((x) => [x.v!, Number(x.n)]), departments: facets.departments.map((x) => [x.v!, Number(x.n)]), types: facets.types.map((x) => [x.v, Number(x.n)]) }} />
      </div>
    </>
  );
}

function Signal({ label, value, tone, hint, href }: { label: string; value: number; tone?: "warn" | "crit"; hint?: string; href?: string }) {
  const body = (
    <>
      <span className={cn("tnum text-[16px] font-semibold leading-none", tone === "crit" && "text-crit", tone === "warn" && "text-warn")}>{value}</span>
      <span className="text-[12.5px] text-ink-3">{label}</span>
    </>
  );
  const cls = "flex h-8 items-center gap-2 rounded-md bg-surface px-2.5 hairline";
  return href ? (
    <Link href={href} className={cn(cls, "hover:bg-surface-2")} title={hint}>
      {body}
    </Link>
  ) : (
    <span className={cls} title={hint}>
      {body}
    </span>
  );
}

