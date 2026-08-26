import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { db, schema } from "@ticketfly/db";
import { eq, sql } from "drizzle-orm";
import { requirePrincipal } from "@/lib/auth";
import { getArticle } from "@/lib/kb";
import { longTime } from "@/lib/utils";
import { Markdown } from "@/components/ui/markdown";
import { ButtonLink } from "@/components/ui/button";

export default async function HelpArticle({ params }: { params: Promise<{ id: string }> }) {
  await requirePrincipal();
  const { id } = await params;
  const row = await getArticle(Number(id));
  if (!row || row.a.status !== "published") notFound();
  await db.update(schema.kbArticles).set({ views: sql`${schema.kbArticles.views} + 1` }).where(eq(schema.kbArticles.id, row.a.id));
  return (
    <div className="mx-auto max-w-2xl pt-10 rise">
      <Link href="/portal/help" className="inline-flex items-center gap-1.5 text-[13px] text-ink-3 hover:text-ink"><ArrowLeft className="size-3.5" /> Guides</Link>
      <p className="eyebrow mt-6">{row.category} · {row.folder}</p>
      <h1 className="mt-2 text-[28px] font-semibold leading-tight tracking-[-0.015em]" style={{ textWrap: "balance" }}>{row.a.title}</h1>
      <p className="mt-2 text-[12.5px] text-ink-3">Updated {longTime(row.a.updatedAt)} · reviewed by IT</p>
      <Markdown text={row.a.body.replace(/^## .*\n\n/, "")} className="prose-tf mt-6 text-[15px] leading-relaxed" />
      <div className="mt-10 rounded-2xl bg-surface p-5 hairline">
        <p className="text-[14px] font-medium">Did this solve it?</p>
        <p className="text-[12.5px] text-ink-3">If not, raise a request and mention this guide — we skip the basics.</p>
        <div className="mt-3 flex gap-2">
          <ButtonLink href={`/portal/new/report-issue?q=${encodeURIComponent(`Tried guide: ${row.a.title} — `)}`} variant="primary" size="sm">Still stuck — report it</ButtonLink>
          <ButtonLink href="/portal/help" variant="ghost" size="sm">Back to guides</ButtonLink>
        </div>
      </div>
    </div>
  );
}
