import Link from "next/link";
import { AlertTriangle, ChevronDown, FileText, Plus, Trash2 } from "lucide-react";
import { requireStaff } from "@/lib/auth";
import { listArticles, listFolders } from "@/lib/kb";
import { cn, relTime } from "@/lib/utils";
import { Topbar } from "@/components/shell/topbar";
import { ButtonLink } from "@/components/ui/button";
import { Tone } from "@/components/ui/pills";

export const metadata = { title: "Solutions" };

export default async function SolutionsPage({ searchParams }: { searchParams: Promise<{ folder?: string; q?: string; status?: string }> }) {
  await requireStaff();
  const sp = await searchParams;
  const folderId = sp.folder ? Number(sp.folder) : undefined;
  const [folders, articles] = await Promise.all([listFolders(), listArticles({ folderId, q: sp.q, status: sp.status })]);
  const total = folders.reduce((s, [, fs]) => s + fs.reduce((x, f) => x + Number(f.n), 0), 0);
  const current = folderId ? folders.flatMap(([, fs]) => fs).find((f) => f.f.id === folderId) : null;
  const overdue = articles.filter((a) => a.a.reviewDue && new Date(a.a.reviewDue) < new Date()).length;

  return (
    <>
      <Topbar
        crumbs={[{ label: "Solutions" }, { label: "Knowledge Base" }]}
        actions={
          <ButtonLink href="/solutions/new" variant="secondary">
            <Plus className="size-3.5" /> Add New
          </ButtonLink>
        }
      />
      <div className="flex min-h-0 flex-1">
        {/* Folder tree (FS left column) */}
        <nav className="w-[240px] shrink-0 overflow-y-auto bg-surface py-3 hairline-r">
          <div className="space-y-px px-2">
            {[
              ["/solutions", "All Articles", true],
              ["/solutions?status=draft", "Drafts", false],
              ["/solutions?status=review", "Articles to review", false],
            ].map(([href, label, all]) => (
              <Link key={href as string} href={href as string} className={cn("flex h-8 items-center gap-2 rounded-md px-2 text-[13px] text-ink-2 hover:bg-surface-2 hover:text-ink", ((all && !folderId && !sp.status) || (href as string).includes(sp.status ?? "§")) && "bg-accent-soft text-accent-ink")}>
                <FileText className="size-3.5" /> {label}
              </Link>
            ))}
          </div>
          <div className="mt-3 space-y-1 px-2">
            {folders.map(([category, fs]) => (
              <details key={category} open={fs.some((f) => f.f.id === folderId)} className="group">
                <summary className="flex h-8 cursor-pointer list-none items-center gap-2 rounded-md px-2 text-[13px] font-medium text-ink hover:bg-surface-2">
                  <span className="flex-1 truncate">{category}</span>
                  <ChevronDown className="size-3.5 text-ink-4 transition-transform group-open:rotate-180" />
                </summary>
                <ul className="mb-1 space-y-px">
                  {fs.map((f) => (
                    <li key={f.f.id}>
                      <Link href={`/solutions?folder=${f.f.id}`} className={cn("flex h-7 items-center gap-2 rounded-md pl-6 pr-2 text-[12.5px] text-ink-2 hover:bg-surface-2 hover:text-ink", folderId === f.f.id && "bg-accent-soft text-accent-ink")}>
                        <span className="flex-1 truncate">{f.f.name}</span>
                        <span className="tnum text-[11px] text-ink-4">{f.n}</span>
                      </Link>
                    </li>
                  ))}
                </ul>
              </details>
            ))}
          </div>
          <div className="mt-4 px-2 hairline-t pt-3">
            <span className="flex h-8 items-center gap-2 px-2 text-[12.5px] text-ink-3">
              <Trash2 className="size-3.5" /> Trash
            </span>
          </div>
        </nav>

        <div className="min-w-0 flex-1 overflow-y-auto">
          <div className="px-6 py-5 rise">
            <div className="flex items-end justify-between">
              <div>
                <h1 className="text-[18px] font-semibold tracking-[-0.01em]">
                  {current ? current.f.name : sp.status === "draft" ? "Drafts" : "All Articles"} <span className="tnum text-ink-3">({current ? current.n : articles.length})</span>
                </h1>
                <p className="text-[12.5px] text-ink-3">{current ? `${current.f.category} · ${current.f.name}` : `Viewing articles across all categories & folders · ${total} total`}</p>
              </div>
              <form className="flex items-center gap-2">
                {folderId && <input type="hidden" name="folder" value={folderId} />}
                <input name="q" defaultValue={sp.q} placeholder="Search articles" className="h-8 w-64 rounded-md bg-surface px-3 text-[13px] hairline focus:outline-none focus:shadow-[inset_0_0_0_1px_var(--accent),0_0_0_3px_var(--ring)]" />
              </form>
            </div>
            {overdue > 0 && (
              <p className="mt-3 flex items-center gap-2 rounded-md bg-warn-soft px-3 py-2 text-[12.5px] text-warn">
                <AlertTriangle className="size-3.5" /> {overdue} article{overdue > 1 ? "s" : ""} past review date — the enhancement Freshservice hid in a red triangle.
              </p>
            )}
            <div className="panel mt-4 overflow-x-auto">
              <table className="w-full min-w-[1080px] text-[13px]">
                <thead>
                  <tr className="text-left [&>th]:h-9 [&>th]:px-3">
                    <th className="label">Title</th>
                    <th className="label">Status</th>
                    <th className="label text-right">Helpful</th>
                    <th className="label text-right">Not Helpful</th>
                    <th className="label text-right">Views</th>
                    <th className="label text-right whitespace-nowrap">In Tickets</th>
                    <th className="label">Author</th>
                    <th className="label">Folder</th>
                    <th className="label text-right">Updated</th>
                  </tr>
                </thead>
                <tbody>
                  {articles.map(({ a, author, folder }) => {
                    const stale = a.reviewDue && new Date(a.reviewDue) < new Date();
                    return (
                      <tr key={a.id} className="row hairline-t">
                        <td className="px-3 py-2">
                          <Link href={`/solutions/${a.id}`} className="flex items-center gap-2 font-medium hover:underline">
                            <FileText className="size-3.5 shrink-0 text-ink-3" />
                            <span className="truncate">{a.title}</span>
                          </Link>
                        </td>
                        <td className="px-3 py-2">
                          <span className="flex items-center gap-1.5">
                            <Tone tone={a.status === "published" ? "ok" : "neutral"} className="capitalize">{a.status}</Tone>
                            {stale && <AlertTriangle className="size-3.5 text-warn" aria-label="Review overdue" />}
                          </span>
                        </td>
                        <td className="tnum px-3 py-2 text-right text-ink-2">{a.helpful}</td>
                        <td className="tnum px-3 py-2 text-right text-ink-2">{a.notHelpful}</td>
                        <td className="tnum px-3 py-2 text-right text-ink-2">{a.views}</td>
                        <td className="tnum px-3 py-2 text-right text-ink-2">{a.insertedInTickets}</td>
                        <td className="px-3 py-2 text-ink-2">{author}</td>
                        <td className="px-3 py-2 text-ink-2">{folder}</td>
                        <td className="tnum px-3 py-2 text-right text-ink-3">{relTime(a.updatedAt)}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
