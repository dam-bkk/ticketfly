import Link from "next/link";
import { ArrowRight, FileText } from "lucide-react";
import { db, schema } from "@ticketfly/db";
import { and, desc, eq, ilike, or, sql } from "drizzle-orm";
import { requirePrincipal } from "@/lib/auth";
import { relTime } from "@/lib/utils";

export const metadata = { title: "Guides" };

export default async function Help({ searchParams }: { searchParams: Promise<{ q?: string; c?: string }> }) {
  await requirePrincipal();
  const { q = "", c = "" } = await searchParams;
  const a = schema.kbArticles;
  const conds = [eq(a.status, "published"), or(sql`${a.reviewDue} is null`, sql`${a.reviewDue} >= now()::date`)!];
  if (q) conds.push(or(ilike(a.title, `%${q}%`), ilike(a.body, `%${q}%`))!);
  if (c) conds.push(eq(schema.kbFolders.category, c));
  const rows = await db.select({ a, folder: schema.kbFolders.name, category: schema.kbFolders.category }).from(a).leftJoin(schema.kbFolders, eq(schema.kbFolders.id, a.folderId)).where(and(...conds)).orderBy(desc(a.views), desc(a.updatedAt)).limit(60);
  const cats = await db.select({ category: schema.kbFolders.category, n: sql<number>`count(*)::int` }).from(a).leftJoin(schema.kbFolders, eq(schema.kbFolders.id, a.folderId)).where(eq(a.status, "published")).groupBy(schema.kbFolders.category).orderBy(sql`count(*) desc`);
  return (
    <div className="pt-10 rise">
      <h1 className="text-[26px] font-semibold tracking-[-0.015em]">Guides</h1>
      <p className="text-[14px] text-ink-3">Written for people who are not in IT. Only reviewed, up-to-date articles are shown here. If a guide does not solve it, raise a request — mention the guide and we skip the basics.</p>
      <form className="mt-6"><input name="q" defaultValue={q} placeholder="Search guides — VPN, password, printer, Outlook…" className="h-12 w-full max-w-2xl rounded-xl bg-surface px-4 text-[15px] shadow-1 hairline focus:outline-none focus:shadow-[0_0_0_4px_var(--ring)]" /></form>
      <div className="mt-4 flex flex-wrap gap-2">
        <Link href="/portal/help" className={`rounded-full px-3 py-1 text-[12.5px] font-medium hairline ${!c ? "bg-accent-soft text-accent-ink" : "text-ink-2 hover:bg-surface-2"}`}>All</Link>
        {cats.map((x) => (
          <Link key={x.category ?? "?"} href={`/portal/help?c=${encodeURIComponent(x.category ?? "")}`} className={`rounded-full px-3 py-1 text-[12.5px] font-medium hairline ${c === x.category ? "bg-accent-soft text-accent-ink" : "text-ink-2 hover:bg-surface-2"}`}>{x.category} <span className="text-ink-3">{x.n}</span></Link>
        ))}
      </div>
      <ul className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {rows.map(({ a: art, folder, category }) => (
          <li key={art.id}>
            <Link href={`/portal/help/${art.id}`} className="group flex h-full flex-col rounded-2xl bg-surface p-5 transition-all hairline hover:-translate-y-0.5 hover:shadow-2">
              <span className="eyebrow">{category} · {folder}</span>
              <span className="mt-2 flex items-start gap-2 text-[15px] font-semibold leading-snug tracking-[-0.01em]"><FileText className="mt-0.5 size-4 shrink-0 text-ink-3" />{art.title}</span>
              <span className="mt-auto flex items-center justify-between pt-4 text-[12px] text-ink-3"><span>{art.views} views · updated {relTime(art.updatedAt)}</span><ArrowRight className="size-3.5 text-ink-3 group-hover:text-accent-ink" /></span>
            </Link>
          </li>
        ))}
        {rows.length === 0 && <li className="rounded-xl bg-surface p-6 text-[13.5px] text-ink-3 hairline">Nothing matches. Try another word, or <Link href="/portal/new/report-issue" className="text-accent-ink underline">report the issue</Link>.</li>}
      </ul>
    </div>
  );
}
