import Link from "next/link";
import { formatTicketRef } from "@ticketfly/core";
import { requireStaff } from "@/lib/auth";
import { globalSearch } from "@/lib/queries";
import { relTime } from "@/lib/utils";
import { Topbar } from "@/components/shell/topbar";
import { Avatar } from "@/components/ui/avatar";
import { Empty } from "@/components/ui/empty";
import { StatusPill } from "@/components/ui/pills";

export const metadata = { title: "Search" };

export default async function SearchPage({ searchParams }: { searchParams: Promise<{ q?: string }> }) {
  await requireStaff();
  const { q = "" } = await searchParams;
  const res = await globalSearch(q);
  const none = !res.tickets.length && !res.people.length && !res.assets.length;
  return (
    <>
      <Topbar crumbs={[{ label: "Search" }, { label: q ? `“${q}”` : "" }]} />
      <div className="flex-1 overflow-y-auto">
        <div className="mx-auto max-w-[900px] px-6 py-6 rise">
          <form className="mb-6">
            <input name="q" defaultValue={q} autoFocus placeholder="Search everything — subjects, descriptions, INC/SR references, people, asset tags" className="h-11 w-full rounded-lg bg-surface px-4 text-[15px] hairline focus:shadow-[inset_0_0_0_1px_var(--accent),0_0_0_3px_var(--ring)] focus:outline-none" />
          </form>
          {q && none && <Empty title={`Nothing for “${q}”`} hint="Full-text search covers every ticket including the Freshservice archive back to 2023." />}
          {res.tickets.length > 0 && (
            <Section title={`Tickets · ${res.tickets.length}`}>
              {res.tickets.map((t) => (
                <Link key={t.id} href={`/tickets/${t.id}`} className="row flex items-center gap-3 px-3 py-2.5">
                  <span className="w-24 shrink-0 font-mono text-[11.5px] text-ink-3">{t.legacyRef ?? formatTicketRef(t.id)}</span>
                  <span className="min-w-0 flex-1 truncate text-[13.5px] font-medium">{t.subject}</span>
                  <span className="text-[12px] text-ink-3">{t.requester}</span>
                  <StatusPill status={t.status} />
                  <span className="w-20 text-right text-[12px] text-ink-4">{relTime(t.createdAt)}</span>
                </Link>
              ))}
            </Section>
          )}
          {res.people.length > 0 && (
            <Section title={`People · ${res.people.length}`}>
              {res.people.map((p) => (
                <Link key={p.id} href={`/people/${p.id}`} className="row flex items-center gap-3 px-3 py-2.5">
                  <Avatar name={p.displayName} size={26} />
                  <span className="text-[13.5px] font-medium">{p.displayName}</span>
                  <span className="text-[12px] text-ink-3">{p.jobTitle} · {p.department}</span>
                </Link>
              ))}
            </Section>
          )}
          {res.assets.length > 0 && (
            <Section title={`Assets · ${res.assets.length}`}>
              {res.assets.map((a) => (
                <Link key={a.id} href={`/assets/${a.id}`} className="row flex items-center gap-3 px-3 py-2.5">
                  <span className="w-24 shrink-0 font-mono text-[11.5px] text-ink-3">{a.assetTag}</span>
                  <span className="min-w-0 flex-1 truncate text-[13.5px] font-medium">{a.name}</span>
                  <span className="text-[12px] text-ink-3">{a.model}</span>
                </Link>
              ))}
            </Section>
          )}
        </div>
      </div>
    </>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="mb-6">
      <p className="label mb-2">{title}</p>
      <div className="panel divide-y divide-line overflow-hidden">{children}</div>
    </section>
  );
}
