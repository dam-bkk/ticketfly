import Link from "next/link";
import { notFound } from "next/navigation";
import { requireStaff } from "@/lib/auth";
import { getArticle } from "@/lib/kb";
import { longTime } from "@/lib/utils";
import { Topbar } from "@/components/shell/topbar";
import { Avatar } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Tone } from "@/components/ui/pills";

export default async function ArticlePage({ params }: { params: Promise<{ id: string }> }) {
  await requireStaff();
  const { id } = await params;
  const row = await getArticle(Number(id));
  if (!row) notFound();
  const { a, author, folder, category } = row;
  return (
    <>
      <Topbar crumbs={[{ label: "Solutions", href: "/solutions" }, { label: folder ?? "" }, { label: a.title }]} />
      <div className="flex-1 overflow-y-auto">
        <div className="mx-auto grid max-w-[1100px] gap-8 px-6 py-6 rise lg:grid-cols-[1fr_280px]">
          <article>
            <p className="eyebrow">
              {category} · {folder}
            </p>
            <h1 className="mt-2 text-[24px] font-semibold leading-tight tracking-[-0.015em]" style={{ textWrap: "balance" }}>
              {a.title}
            </h1>
            <div className="mt-3 flex items-center gap-2 text-[12.5px] text-ink-3">
              <Avatar name={author ?? "?"} size={20} /> {author} · updated {longTime(a.updatedAt)}
              <Tone tone={a.status === "published" ? "ok" : "neutral"} className="capitalize">{a.status}</Tone>
            </div>
            <div className="prose-tf mt-6 max-w-[68ch] whitespace-pre-wrap text-[14px] leading-relaxed text-ink">{a.body.replace(/^## .*\n\n/, "")}</div>
          </article>
          <aside className="space-y-3">
            <div className="panel p-4">
              <p className="label mb-2">Usage</p>
              <dl className="space-y-1.5 text-[13px]">
                {[["Views", a.views], ["Helpful", a.helpful], ["Not helpful", a.notHelpful], ["Inserted in tickets", a.insertedInTickets]].map(([k, v]) => (
                  <div key={k as string} className="flex justify-between">
                    <dt className="text-ink-3">{k}</dt>
                    <dd className="tnum font-medium">{v}</dd>
                  </div>
                ))}
              </dl>
            </div>
            <div className="panel p-4">
              <p className="label mb-2">Review</p>
              <p className="text-[13px]">Due {a.reviewDue ?? "—"}</p>
              <p className="mt-1 text-[12px] text-ink-3">Owner is asked to confirm the article is still correct; stale articles are flagged in the list and hidden from the portal search.</p>
            </div>
            <div className="flex gap-2">
              <Button type="button" variant="secondary" size="sm" className="flex-1">
                Edit
              </Button>
              <Button type="button" variant="ghost" size="sm">
                Insert into ticket
              </Button>
            </div>
            <Link href="/solutions" className="block text-center text-[12.5px] text-ink-3 hover:text-ink">
              Back to all articles
            </Link>
          </aside>
        </div>
      </div>
    </>
  );
}
