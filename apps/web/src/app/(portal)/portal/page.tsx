import Link from "next/link";
import { ArrowRight, ArrowUpRight } from "lucide-react";
import { formatTicketRef } from "@ticketfly/core";
import { requirePrincipal } from "@/lib/auth";
import { listServices, myRequests } from "@/lib/queries";
import { myDevices } from "@/lib/assets";
import { Laptop, Smartphone } from "lucide-react";
import { relTime, STATUS_LABEL } from "@/lib/utils";
import { StatusDot } from "@/components/ui/pills";
import { ServiceIcon } from "./icons";
import { PortalSearch } from "./search";

export const metadata = { title: "Help" };

function greeting() {
  const h = new Date().getHours();
  return h < 12 ? "Good morning" : h < 18 ? "Good afternoon" : "Good evening";
}

export default async function PortalHome() {
  const me = await requirePrincipal();
  const [services, requests, devices] = await Promise.all([listServices(), myRequests(me.id), myDevices(me.id)]);
  const toAck = devices.filter((d) => !d.acknowledgedAt && !d.returnedAt).length;
  const open = requests.filter((r) => r.status !== "closed" && r.status !== "resolved");
  const popular = services.filter((s) => s.popular);
  const rest = services.filter((s) => !s.popular);
  const first = me.displayName.split(" ")[0];

  return (
    <div className="rise">
      <section className="pt-14 pb-10">
        <p className="eyebrow">{me.department} · {me.officeLocation}</p>
        <h1 className="mt-3 text-[38px] font-semibold leading-[1.1] tracking-[-0.03em] text-ink md:text-[46px]" style={{ textWrap: "balance" }}>
          {greeting()}, {first}. <span className="font-normal text-ink-3">What do you need?</span>
        </h1>
        <div className="mt-7 max-w-2xl">
          <PortalSearch services={services.map((s) => ({ slug: s.slug, name: s.name, tagline: s.tagline, icon: s.icon }))} />
        </div>
      </section>

      <section>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {popular.map((s) => (
            <Link key={s.slug} href={`/portal/new/${s.slug}`} className="group relative flex min-h-[150px] flex-col justify-between rounded-2xl bg-surface p-5 transition-all hairline hover:-translate-y-0.5 hover:shadow-2">
              <span className="flex size-9 items-center justify-center rounded-lg bg-surface-2 text-ink-2 transition-colors group-hover:bg-accent-soft group-hover:text-accent-ink">
                <ServiceIcon name={s.icon} className="size-[18px]" />
              </span>
              <span>
                <span className="block text-[15px] font-semibold tracking-[-0.01em]">{s.name}</span>
                <span className="mt-0.5 block text-[12.5px] leading-snug text-ink-3">{s.tagline}</span>
              </span>
              <ArrowUpRight className="absolute right-4 top-4 size-4 text-ink-4 opacity-0 transition-opacity group-hover:opacity-100" />
            </Link>
          ))}
        </div>
        <div className="mt-3 flex flex-wrap gap-2">
          {rest.map((s) => (
            <Link key={s.slug} href={`/portal/new/${s.slug}`} className="inline-flex h-9 items-center gap-2 rounded-full bg-surface px-3.5 text-[13px] font-medium text-ink-2 transition-colors hairline hover:bg-surface-2 hover:text-ink">
              <ServiceIcon name={s.icon} className="size-3.5 text-ink-3" />
              {s.name}
            </Link>
          ))}
        </div>
      </section>

      <section className="mt-14 grid gap-10 lg:grid-cols-[1.4fr_1fr]">
        <div>
          <div className="flex items-baseline justify-between">
            <h2 className="text-[16px] font-semibold tracking-[-0.01em]">Your requests</h2>
            <Link href="/portal/requests" className="text-[12.5px] font-medium text-ink-3 hover:text-ink">
              See all {requests.length}
            </Link>
          </div>
          {open.length === 0 ? (
            <p className="mt-4 rounded-xl bg-surface p-6 text-[13.5px] text-ink-3 hairline">Nothing open right now. When you raise something, you will see its progress here and get an email at every step.</p>
          ) : (
            <ul className="mt-4 divide-y divide-line rounded-xl bg-surface hairline">
              {open.slice(0, 5).map((r) => (
                <li key={r.id}>
                  <Link href={`/portal/requests/${r.id}`} className="row flex items-center gap-4 px-5 py-3.5 first:rounded-t-xl last:rounded-b-xl">
                    <StatusDot status={r.status} className="size-2" />
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-[14px] font-medium">{r.subject}</span>
                      <span className="block text-[12.5px] text-ink-3">
                        {STATUS_LABEL[r.status]}
                        {r.assignee ? ` · ${r.assignee} is on it` : " · waiting to be picked up"} · {formatTicketRef(r.id)}
                      </span>
                    </span>
                    <span className="text-[12px] text-ink-4">{relTime(r.updatedAt)}</span>
                    <ArrowRight className="size-4 text-ink-4" />
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </div>
        <div>
          <div className="flex items-baseline justify-between">
            <h2 className="text-[16px] font-semibold tracking-[-0.01em]">Your devices</h2>
            <Link href="/portal/devices" className="text-[12.5px] font-medium text-ink-3 hover:text-ink">
              {toAck ? `${toAck} to acknowledge` : "Manage"}
            </Link>
          </div>
          <ul className="mt-4 mb-8 divide-y divide-line rounded-xl bg-surface hairline">
            {devices.length === 0 && <li className="px-4 py-3 text-[13px] text-ink-3">No devices recorded against your name.</li>}
            {devices.slice(0, 3).map((d) => (
              <li key={d.id}>
                <Link href="/portal/devices" className="row flex items-center gap-3 px-4 py-2.5 text-[13px] first:rounded-t-xl last:rounded-b-xl">
                  {d.type === "mobile" ? <Smartphone className="size-4 text-ink-3" /> : <Laptop className="size-4 text-ink-3" />}
                  <span className="min-w-0 flex-1 truncate font-medium">{d.model ?? d.name}</span>
                  <span className={`text-[11.5px] ${d.returnedAt ? "text-warn" : d.acknowledgedAt ? "text-ink-4" : "font-medium text-accent-ink"}`}>{d.returnedAt ? "Returned" : d.acknowledgedAt ? "Acknowledged" : "Acknowledge"}</span>
                </Link>
              </li>
            ))}
          </ul>
          <h2 className="text-[16px] font-semibold tracking-[-0.01em]">Good to know</h2>
          <ul className="mt-4 space-y-3">
            {[
              ["Planned maintenance", "VPN gateway upgrade Saturday 30 Aug, 22:00–01:00 HKT. Connections will drop briefly.", "info"],
              ["New: same-day laptop swaps in HK and KL", "Stock is in the office. Ask through Hardware & equipment.", "ok"],
              ["Phishing wave targeting Finance", "If an invoice email looks off, report it — one click, no questions asked.", "warn"],
            ].map(([t, body, tone]) => (
              <li key={t} className="rounded-xl bg-surface p-4 hairline">
                <span className="flex items-center gap-2 text-[13.5px] font-medium">
                  <span className={`size-1.5 rounded-full ${tone === "warn" ? "bg-warn" : tone === "ok" ? "bg-ok" : "bg-accent"}`} />
                  {t}
                </span>
                <p className="mt-1 text-[12.5px] leading-relaxed text-ink-3">{body}</p>
              </li>
            ))}
          </ul>
        </div>
      </section>
    </div>
  );
}
