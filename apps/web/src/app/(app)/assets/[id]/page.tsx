import Link from "next/link";
import { notFound } from "next/navigation";
import { Laptop, Smartphone } from "lucide-react";
import { formatTicketRef } from "@ticketfly/core";
import { requireStaff } from "@/lib/auth";
import { getAssetFull, listPickers } from "@/lib/assets";
import { cn, longTime, money, relTime } from "@/lib/utils";
import { Topbar } from "@/components/shell/topbar";
import { Avatar } from "@/components/ui/avatar";
import { StatusDot, Tone } from "@/components/ui/pills";
import { EditPanel } from "./edit-panel";
import { SoftwareTable } from "./software-table";

const TABS = ["overview", "relationships", "software", "components", "associations", "purchase-orders", "contracts", "expenses", "assignment", "activity"] as const;
type Tab = (typeof TABS)[number];
const TAB_LABEL: Record<Tab, string> = { overview: "Overview", relationships: "Relationships", software: "Software", components: "Components", associations: "Associations", "purchase-orders": "Purchase Orders", contracts: "Contracts", expenses: "Expenses", assignment: "Assignment", activity: "Activity" };

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const data = await getAssetFull(Number(id));
  return { title: data ? data.a.hostname ?? data.a.name : "Asset" };
}

export default async function AssetPage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ tab?: string }> }) {
  await requireStaff();
  const { id } = await params;
  const { tab: rawTab } = await searchParams;
  const tab: Tab = (TABS as readonly string[]).includes(rawTab ?? "") ? (rawTab as Tab) : "overview";
  const [data, pickers] = await Promise.all([getAssetFull(Number(id)), listPickers()]);
  if (!data) notFound();
  const { a, owner, managedBy, managedByGroup, software, assignments, tickets, activity, contracts, pos, peers } = data;
  const title = a.hostname ?? a.name;
  const counts: Partial<Record<Tab, number>> = { software: software.length, components: 4, associations: tickets.length, contracts: contracts.length, "purchase-orders": pos.length, assignment: assignments.length, activity: activity.length, relationships: peers.length };
  const monthly = software.reduce((s, x) => s + Number(x.cost), 0);

  return (
    <>
      <Topbar crumbs={[{ label: "Assets" }, { label: "Inventory", href: "/assets/inventory" }, { label: title }]} />
      <div className="flex min-h-0 flex-1">
        <div className="flex min-w-0 flex-1 flex-col">
          {/* FS-style title bar */}
          <div className="shrink-0 px-5 pt-4">
            <div className="flex items-center gap-3 rounded-lg bg-accent-soft/60 px-4 py-2.5">
              <h1 className="text-[16px] font-semibold tracking-[-0.01em]">{title}</h1>
              <span className="font-mono text-[11.5px] text-ink-3">{a.assetTag}</span>
              <span className="ml-auto flex items-center gap-2">
                {a.returnedAt && <Tone tone="warn">Returned by user · unassign</Tone>}
                {owner && !a.acknowledgedAt && !a.returnedAt && <Tone tone="warn">Awaiting acknowledgement</Tone>}
                {a.compliance === "non_compliant" && <Tone tone="crit">Non-compliant</Tone>}
                {a.lastSeenAt && <span className="text-[12px] text-ink-3">Seen {relTime(a.lastSeenAt)} · {a.lastSeenCity}</span>}
              </span>
            </div>
          </div>

          <div className="flex min-h-0 flex-1">
            {/* Left tabs (Freshservice anatomy) */}
            <nav className="w-[200px] shrink-0 space-y-px px-5 py-4">
              {TABS.map((t) => (
                <Link key={t} href={`/assets/${a.id}?tab=${t}`} className={cn("flex h-8 items-center rounded-md px-2.5 text-[13px] text-ink-2 hover:bg-surface-2 hover:text-ink", tab === t && "bg-accent-soft font-medium text-accent-ink hover:bg-accent-soft hover:text-accent-ink")}>
                  <span className="flex-1">{TAB_LABEL[t]}</span>
                  {counts[t] ? <span className="tnum text-[11px] text-ink-3">{counts[t]}</span> : null}
                </Link>
              ))}
            </nav>

            {/* Centre */}
            <div className="min-w-0 flex-1 overflow-y-auto px-6 py-4 hairline-l">
              {tab === "overview" && (
                <div className="space-y-6">
                  <Section title="General">
                    <KV rows={[["Name", a.name], ["Asset Type", cap(a.type)], ["Asset Tag", a.assetTag], ["Impact", cap(a.impact)], ["Description", "—"], ["End of Life", a.endOfLife ?? "—"], ["Discovery Enabled", a.discoveryEnabled ? "Yes" : "No"], ["Created by - Source", a.source === "manual" ? "Agent" : "Discovery Agent"], ["Created At", longTime(a.createdAt)], ["Last updated by - Source", cap(a.source)], ["Updated At", longTime(a.updatedAt)], ["Sources", a.source === "manual" ? "User" : `Discovery Agent, ${cap(a.source)}, User`]]} />
                  </Section>
                  <Section title="Hardware">
                    <KV rows={[["Product", a.model ?? "—"], ["Vendor", a.vendor ?? "—"], ["Cost", a.cost ? money(a.cost) : "—"], ["Warranty", a.warrantyExpiry ? (new Date(a.warrantyExpiry) > new Date() ? "In warranty" : "Expired") : "—"], ["Acquisition Date", a.purchaseDate ?? "—"], ["Warranty Expiry Date", a.warrantyExpiry ?? "—"], ["Domain", a.domain ?? "—"], ["Asset State", cap(a.status.replace("_", " "))], ["Serial Number", a.serial ?? "—"], ["Last Audit Date", a.lastSeenAt ? longTime(a.lastSeenAt) : "—"], ["Region", a.lastSeenCountry ?? "—"]]} />
                  </Section>
                  {(a.type === "laptop" || a.type === "desktop" || a.type === "server") && (
                    <Section title="Computer">
                      <KV rows={[["OS", a.os ?? "—"], ["OS Version", a.osVersion ?? "—"], ["Memory(GB)", a.memoryGb ?? "—"], ["Disk Space(GB)", a.diskGb ?? "—"], ["CPU Speed(GHz)", a.cpuGhz ?? "—"], ["CPU Core Count", a.cpuCores?.toString() ?? "—"], ["MAC Address", a.macAddress ?? "—"], ["Hostname", a.hostname ?? "—"], ["IP Address", a.ipAddress ?? "—"], ["Last login by", a.lastLoginBy ?? "—"], ["Encryption", a.encrypted === null ? "—" : a.encrypted ? "On" : "Off"], ["Compliance", cap(a.compliance.replace("_", "-"))]]} />
                    </Section>
                  )}
                  {(a.type === "mobile" || a.type === "tablet") && (
                    <Section title="Mobile">
                      <KV rows={[["OS", a.os ?? "—"], ["OS Version", a.osVersion ?? "—"], ["Encryption", a.encrypted ? "On" : "Off"], ["Compliance", cap(a.compliance.replace("_", "-"))], ["Last seen", a.lastSeenAt ? longTime(a.lastSeenAt) : "—"]]} />
                    </Section>
                  )}
                </div>
              )}

              {tab === "software" && <SoftwareTable assetId={a.id} rows={software} monthly={monthly} />}

              {tab === "relationships" && (
                <div>
                  <p className="mb-3 text-[13px] text-ink-3">Other assets used by the same person. Upstream/downstream relationship types arrive with the CMDB phase.</p>
                  {peers.length === 0 ? <EmptyTab text="No related assets." /> : (
                    <ul className="divide-y divide-line rounded-lg bg-surface hairline">
                      {peers.map((p) => (
                        <li key={p.id}>
                          <Link href={`/assets/${p.id}`} className="row flex items-center gap-3 px-4 py-2.5 text-[13px]">
                            {p.type === "mobile" ? <Smartphone className="size-4 text-ink-3" /> : <Laptop className="size-4 text-ink-3" />}
                            <span className="font-medium text-accent-ink">{p.name}</span>
                            <span className="text-ink-3">{p.model}</span>
                            <span className="ml-auto font-mono text-[11px] text-ink-3">{p.assetTag}</span>
                          </Link>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              )}

              {tab === "components" && (
                <div className="rounded-lg bg-surface hairline">
                  <table className="w-full text-[13px]">
                    <thead><tr className="text-left [&>th]:h-9 [&>th]:px-4"><th className="label">Component</th><th className="label">Detail</th><th className="label">Source</th></tr></thead>
                    <tbody>
                      {[["Processor", `${a.cpuCores ?? "—"} cores @ ${a.cpuGhz ?? "—"} GHz`], ["Memory", `${a.memoryGb ?? "—"} GB`], ["Storage", `${a.diskGb ?? "—"} GB`], ["Network adapter", a.macAddress ?? "—"]].map(([k, v]) => (
                        <tr key={k} className="hairline-t"><td className="px-4 py-2 font-medium">{k}</td><td className="px-4 py-2 text-ink-2">{v}</td><td className="px-4 py-2 text-ink-3">Intune hardware inventory</td></tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}

              {tab === "associations" && (
                <div>
                  <div className="mb-3 flex items-center justify-between">
                    <p className="text-[13px] text-ink-3">Tickets, changes and projects linked to this asset. Today: tickets raised by the person using it.</p>
                    <Link href="/portal/new/report-issue" className="text-[12.5px] font-medium text-accent-ink hover:underline">+ Associate</Link>
                  </div>
                  {tickets.length === 0 ? <EmptyTab text="There are no associations" /> : (
                    <ul className="divide-y divide-line rounded-lg bg-surface hairline">
                      {tickets.map((t) => (
                        <li key={t.id}>
                          <Link href={`/tickets/${t.id}`} className="row flex items-center gap-3 px-4 py-2.5 text-[13px]">
                            <StatusDot status={t.status} />
                            <span className="w-24 font-mono text-[11.5px] text-ink-3">{t.legacyRef ?? formatTicketRef(t.id)}</span>
                            <span className="min-w-0 flex-1 truncate font-medium">{t.subject}</span>
                            <span className="capitalize text-ink-3">{t.kind}</span>
                            <span className="text-[12px] text-ink-4">{relTime(t.createdAt)}</span>
                          </Link>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              )}

              {tab === "purchase-orders" && (pos.length === 0 ? <EmptyTab text="No purchase orders linked. Link one from Assets → Purchase Orders." /> : (
                <ul className="divide-y divide-line rounded-lg bg-surface hairline">
                  {pos.map((p) => (
                    <li key={p.id} className="flex items-center gap-3 px-4 py-2.5 text-[13px]">
                      <span className="font-mono text-[12px] font-medium text-accent-ink">{p.number}</span>
                      <span className="flex-1 text-ink-2">{p.vendor} · {p.items.map((i) => `${i.qty}× ${i.name}`).join(", ")}</span>
                      <Tone tone={p.status === "received" ? "ok" : p.status === "ordered" ? "info" : "warn"} className="capitalize">{p.status.replace("_", " ")}</Tone>
                      <span className="tnum w-24 text-right">{money(p.total)}</span>
                    </li>
                  ))}
                </ul>
              ))}

              {tab === "contracts" && (contracts.length === 0 ? <EmptyTab text="No contracts cover this asset's vendor." /> : (
                <ul className="divide-y divide-line rounded-lg bg-surface hairline">
                  {contracts.map((c) => (
                    <li key={c.id} className="flex items-center gap-3 px-4 py-2.5 text-[13px]">
                      <span className="flex-1 font-medium">{c.name}</span>
                      <span className="text-ink-3">{c.startDate} → {c.endDate}</span>
                      <Tone tone={c.status === "active" ? "ok" : c.status === "expiring" ? "warn" : "neutral"} className="capitalize">{c.status}</Tone>
                      <span className="tnum w-24 text-right">{money(c.cost)}</span>
                    </li>
                  ))}
                </ul>
              ))}

              {tab === "expenses" && (
                <div className="grid gap-3 sm:grid-cols-3">
                  {[["Purchase", a.cost ? money(a.cost) : "—", a.purchaseDate ?? ""], ["Software / month", money(monthly), `${software.length} titles`], ["Depreciation (3y straight-line)", a.cost ? money(Number(a.cost) / 36) + " / mo" : "—", "book value shown in Reporting"]].map(([k, v, s]) => (
                    <div key={k} className="panel p-4">
                      <p className="label">{k}</p>
                      <p className="tnum mt-2 text-[20px] font-semibold tracking-[-0.02em]">{v}</p>
                      <p className="mt-1 text-[11.5px] text-ink-3">{s}</p>
                    </div>
                  ))}
                </div>
              )}

              {tab === "assignment" && (
                <div>
                  <p className="mb-3 text-[13px] text-ink-3">Who has had this device, when they confirmed receipt, and when it came back. The requester sees the same record in the portal.</p>
                  <ul className="divide-y divide-line rounded-lg bg-surface hairline">
                    {assignments.map(({ x, person }) => (
                      <li key={x.id} className="flex items-center gap-3 px-4 py-2.5 text-[13px]">
                        <Avatar name={person ?? "?"} size={24} />
                        <span className="w-44 truncate font-medium">{person ?? "Stock"}</span>
                        <span className="text-ink-3">Assigned {longTime(x.assignedAt)}</span>
                        <span className="ml-auto flex items-center gap-2">
                          {x.acknowledgedAt ? <Tone tone="ok">Acknowledged {relTime(x.acknowledgedAt)}</Tone> : !x.returnedAt ? <Tone tone="warn">Not acknowledged</Tone> : null}
                          {x.returnedAt ? <Tone tone="neutral">Returned {relTime(x.returnedAt)}</Tone> : <Tone tone="info">Current</Tone>}
                        </span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {tab === "activity" && (activity.length === 0 ? <EmptyTab text="No changes recorded on this asset yet." /> : (
                <ul className="space-y-2">
                  {activity.map((e) => (
                    <li key={e.id} className="flex items-start gap-3 rounded-lg bg-surface px-4 py-2.5 text-[13px] hairline">
                      <Avatar name={e.actorName} size={22} />
                      <span className="min-w-0 flex-1">
                        <span className="font-medium">{e.actorName}</span> <span className="font-mono text-[11.5px] text-ink-3">{e.action}</span>
                        {e.after ? <span className="ml-2 font-mono text-[11px] text-ok">{JSON.stringify(e.after)}</span> : null}
                      </span>
                      <span className="text-[12px] text-ink-4">{relTime(e.ts)}</span>
                    </li>
                  ))}
                </ul>
              ))}
            </div>
          </div>
        </div>

        {/* Right: Edit properties (FS anatomy, functional) */}
        <aside className="w-[300px] shrink-0 overflow-y-auto bg-surface hairline-l">
          <div className="px-4 py-3 hairline-b">
            <KVSmall rows={[["Workspace", "IT Division"], ["Product", a.model ?? "—"], ["Asset State", cap(a.status.replace("_", " "))], ["Serial Number", a.serial ?? "—"]]} />
          </div>
          <EditPanel asset={{ id: a.id, impact: a.impact, status: a.status, usageType: a.usageType, location: a.lastSeenCity, department: a.department, ownerId: a.ownerId, managedById: a.managedById, managedByGroupId: a.managedByGroupId, assignedOn: a.assignedOn?.toISOString() ?? null, endOfLife: a.endOfLife }} owner={owner ? { displayName: owner.displayName, status: owner.status } : null} managedBy={managedBy?.displayName ?? null} group={managedByGroup?.name ?? null} people={pickers.people} groups={pickers.groups} />
        </aside>
      </div>
    </>
  );
}

function cap(s: string) {
  return s ? s[0]!.toUpperCase() + s.slice(1) : s;
}
function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section>
      <h2 className="mb-2 text-[14px] font-semibold">{title}</h2>
      <div className="rounded-lg bg-surface px-4 py-2 hairline">{children}</div>
    </section>
  );
}
function KV({ rows }: { rows: [string, string][] }) {
  return (
    <dl className="grid grid-cols-[220px_1fr] gap-y-1 text-[13px]">
      {rows.map(([k, v]) => (
        <div key={k} className="contents">
          <dt className="py-1 text-ink-3">{k}</dt>
          <dd className="py-1 font-medium">{v}</dd>
        </div>
      ))}
    </dl>
  );
}
function KVSmall({ rows }: { rows: [string, string][] }) {
  return (
    <dl className="grid grid-cols-[96px_1fr] gap-y-1 text-[12.5px]">
      {rows.map(([k, v]) => (
        <div key={k} className="contents">
          <dt className="truncate text-ink-3">{k}</dt>
          <dd className="truncate font-medium">{v}</dd>
        </div>
      ))}
    </dl>
  );
}
function EmptyTab({ text }: { text: string }) {
  return <p className="rounded-lg bg-surface px-4 py-10 text-center text-[13px] text-ink-3 hairline">{text}</p>;
}
