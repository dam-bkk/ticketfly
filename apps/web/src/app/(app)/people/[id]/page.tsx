import Link from "next/link";
import { notFound } from "next/navigation";
import { Laptop, Smartphone } from "lucide-react";
import { formatTicketRef, rollupCost } from "@ticketfly/core";
import { requireStaff } from "@/lib/auth";
import { getPerson } from "@/lib/queries";
import { money, relTime } from "@/lib/utils";
import { Topbar } from "@/components/shell/topbar";
import { Avatar } from "@/components/ui/avatar";
import { StatusDot, Tone } from "@/components/ui/pills";
import { TaskList } from "../../journeys/onboarding/task-list";

export default async function PersonPage({ params }: { params: Promise<{ id: string }> }) {
  await requireStaff();
  const { id } = await params;
  const data = await getPerson(Number(id));
  if (!data) notFound();
  const { p, manager, devices, grants, tickets, onboarding, cloneFrom } = data;
  const active = grants.filter((g) => !g.revokedAt);
  const cost = rollupCost([
    ...active.map((g) => ({ label: g.displayName, monthly: Number(g.monthlyCost), category: "licence" as const })),
    ...devices.filter((d) => d.status === "in_use").map((d) => ({ label: d.model ?? d.name, oneOff: Number(d.cost ?? 0), category: "hardware" as const })),
  ]);
  const bySystem = Object.entries(
    active.reduce<Record<string, typeof active>>((acc, g) => {
      (acc[g.system] ??= []).push(g);
      return acc;
    }, {}),
  );

  return (
    <>
      <Topbar crumbs={[{ label: "People", href: "/people" }, { label: p.displayName }]} />
      <div className="flex-1 overflow-y-auto">
        <div className="mx-auto max-w-[1100px] px-6 py-6 rise">
          <div className="flex items-start gap-5">
            <Avatar name={p.displayName} size={56} />
            <div className="min-w-0 flex-1">
              <h1 className="text-[22px] font-semibold tracking-[-0.01em]">{p.displayName}</h1>
              <p className="text-[13.5px] text-ink-2">{p.jobTitle} · {p.department} · {p.officeLocation}</p>
              <p className="mt-1 text-[12.5px] text-ink-3">
                {p.email}
                {manager && (
                  <>
                    {" "}· reports to{" "}
                    <Link href={`/people/${manager.id}`} className="text-ink-2 hover:underline">
                      {manager.displayName}
                    </Link>
                  </>
                )}
                {p.joinDate && ` · joined ${p.joinDate}`}
              </p>
              <div className="mt-2 flex gap-2">
                {p.status === "onboarding" && <Tone tone="info">Onboarding · joins {p.joinDate}</Tone>}
                {p.status === "offboarding" && <Tone tone="warn">Offboarding · last day {p.leaveDate}</Tone>}
                <Tone tone="neutral" className="capitalize">{p.role}</Tone>
              </div>
            </div>
            <div className="panel min-w-[240px] p-4">
              <p className="label">Cost of this seat</p>
              <p className="tnum mt-2 text-[26px] font-semibold leading-none tracking-[-0.02em]">{money(cost.monthly)}<span className="text-[13px] font-normal text-ink-3"> / month</span></p>
              <p className="mt-1.5 text-[12px] text-ink-3">{money(cost.firstYear)} first year incl. {money(cost.oneOff)} hardware</p>
              <p className="mt-1 text-[11.5px] text-ink-4">{active.length} access grants · {devices.length} devices</p>
            </div>
          </div>

          {onboarding && (
            <section className="panel mt-6 p-5">
              <div className="mb-3 flex items-center justify-between">
                <h2 className="text-[14px] font-semibold capitalize">{onboarding.kind} plan</h2>
                <span className="text-[12px] text-ink-3">
                  {onboarding.kind === "onboarding" ? "Join" : "Last"} date {onboarding.joinDate}
                  {cloneFrom && (
                    <>
                      {" "}· access cloned from{" "}
                      <Link href={`/people/${cloneFrom.id}`} className="text-ink-2 hover:underline">
                        {cloneFrom.displayName}
                      </Link>
                    </>
                  )}
                </span>
              </div>
              <TaskList onboardingId={onboarding.id} tasks={onboarding.tasks} joinDate={onboarding.joinDate} />
            </section>
          )}

          <div className="mt-4 grid gap-4 lg:grid-cols-[1.2fr_1fr]">
            <section className="panel overflow-hidden">
              <div className="flex items-center justify-between px-4 py-3 hairline-b">
                <h2 className="text-[14px] font-semibold">Access grants</h2>
                <span className="text-[12px] text-ink-3">What offboarding will revoke</span>
              </div>
              {bySystem.length === 0 ? (
                <p className="px-4 py-6 text-[13px] text-ink-3">No grants recorded. Grants are created by access requests and onboarding.</p>
              ) : (
                <ul className="divide-y divide-line">
                  {bySystem.map(([system, gs]) => (
                    <li key={system} className="px-4 py-3">
                      <p className="mb-1.5 text-[12.5px] font-medium">{system}</p>
                      <ul className="space-y-1">
                        {gs.map((g) => (
                          <li key={g.id} className="flex items-center gap-3 text-[13px]">
                            <span className="flex-1 text-ink-2">{g.displayName}</span>
                            <span className="font-mono text-[10.5px] text-ink-4">{g.internalName}</span>
                            <span className="tnum w-16 text-right text-ink-3">{Number(g.monthlyCost) ? money(g.monthlyCost) : "—"}</span>
                          </li>
                        ))}
                      </ul>
                    </li>
                  ))}
                </ul>
              )}
            </section>
            <div className="space-y-4">
              <section className="panel overflow-hidden">
                <div className="px-4 py-3 hairline-b">
                  <h2 className="text-[14px] font-semibold">Devices</h2>
                </div>
                {devices.length === 0 ? (
                  <p className="px-4 py-6 text-[13px] text-ink-3">No devices assigned.</p>
                ) : (
                  <ul className="divide-y divide-line">
                    {devices.map((d) => (
                      <li key={d.id}>
                        <Link href={`/assets/${d.id}`} className="row flex items-center gap-3 px-4 py-2.5 text-[13px]">
                          {d.type === "mobile" ? <Smartphone className="size-4 text-ink-3" /> : <Laptop className="size-4 text-ink-3" />}
                          <span className="min-w-0 flex-1">
                            <span className="block truncate font-medium">{d.model}</span>
                            <span className="block font-mono text-[11px] text-ink-3">{d.assetTag}</span>
                          </span>
                          <span className={`size-1.5 rounded-full ${d.compliance === "compliant" ? "bg-ok" : d.compliance === "non_compliant" ? "bg-crit" : "bg-ink-4"}`} />
                          <span className="text-[12px] text-ink-3">{d.lastSeenCity}</span>
                        </Link>
                      </li>
                    ))}
                  </ul>
                )}
              </section>
              <section className="panel overflow-hidden">
                <div className="px-4 py-3 hairline-b">
                  <h2 className="text-[14px] font-semibold">Tickets</h2>
                </div>
                {tickets.length === 0 ? (
                  <p className="px-4 py-6 text-[13px] text-ink-3">No tickets yet.</p>
                ) : (
                  <ul className="divide-y divide-line">
                    {tickets.map((t) => (
                      <li key={t.id}>
                        <Link href={`/tickets/${t.id}`} className="row flex items-center gap-3 px-4 py-2.5 text-[13px]">
                          <StatusDot status={t.status} />
                          <span className="min-w-0 flex-1 truncate">{t.subject}</span>
                          <span className="font-mono text-[11px] text-ink-4">{t.legacyRef ?? formatTicketRef(t.id)}</span>
                          <span className="text-[12px] text-ink-4">{relTime(t.createdAt)}</span>
                        </Link>
                      </li>
                    ))}
                  </ul>
                )}
              </section>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
