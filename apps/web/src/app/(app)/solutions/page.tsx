import Link from "next/link";
import { AlertTriangle, ChevronDown, FileText, Plus, Trash2 } from "lucide-react";
import { requireStaff } from "@/lib/auth";
import { listArticles, listFolders } from "@/lib/kb";
import { cn, relTime } from "@/lib/utils";
import { Topbar } from "@/components/shell/topbar";
import { ButtonLink } from "@/components/ui/button";
import { Tone } from "@/components/ui/pills";
import { Input } from "@/components/ui/input";

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
        {/* Folder tree */}
        <nav className="w-[240px] shrink-0 overflow-y-auto bg-surface py-3 hairline-r">
          <div className="space-y-px px-2">
            {[
              ["/solutions", "All Articles", true],
              ["/solutions?status=draft", "Drafts", false],
              ["/solutions?status=review", "Articles to review", false],
            ].map(([href, label, all]) => (
              <Link key={href as string} href={href as string} className={cn("flex h-8 items-center gap-2 rounded-md px-2 text-[13.5px] text-ink-2 hover:bg-surface-2 hover:text-ink", ((all && !folderId && !sp.status) || (href as string).includes(sp.status ?? "§")) && "bg-accent-soft text-accent-ink")}>
                <FileText className="size-3.5" /> {label}
              </Link>
            ))}
          </div>
          <div className="mt-3 space-y-1 px-2">
            {folders.map(([category, fs]) => (
              <details key={category} open={fs.some((f) => f.f.id === folderId)} className="group">
                <summary className="flex h-8 cursor-pointer list-none items-center gap-2 rounded-md px-2 text-[13.5px] font-medium text-ink hover:bg-surface-2">
                  <span className="flex-1 truncate">{category}</span>
                  <ChevronDown className="size-3.5 text-ink-3 transition-transform group-open:rotate-180" />
                </summary>
                <ul className="mb-1 space-y-px">
                  {fs.map((f) => (
                    <li key={f.f.id}>
                      <Link href={`/solutions?folder=${f.f.id}`} className={cn("flex h-7 items-center gap-2 rounded-md pl-6 pr-2 text-[12.5px] text-ink-2 hover:bg-surface-2 hover:text-ink", folderId === f.f.id && "bg-accent-soft text-accent-ink")}>
                        <span className="flex-1 truncate">{f.f.name}</span>
                        <span className="tnum text-[11px] text-ink-3">{f.n}</span>
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
                <h1 className="text-[16px] font-semibold tracking-[-0.01em]">
                  {current ? current.f.name : sp.status === "draft" ? "Drafts" : "All Articles"} <span className="tnum text-ink-3">({current ? current.n : articles.length})</span>
                </h1>
                <p className="text-[12.5px] text-ink-3">{current ? `${current.f.category} · ${current.f.name}` : `Viewing articles across all categories & folders · ${total} total`}</p>
              </div>
              <form className="flex items-center gap-2">
                {folderId && <input type="hidden" name="folder" value={folderId} />}
                <Input name="q" defaultValue={sp.q} placeholder="Search articles" className="h-8 w-64 text-[13.5px]" />
              </form>
            </div>
            {overdue > 0 && (
              <p className="mt-3 flex items-center gap-2 rounded-md bg-warn-soft px-3 py-2 text-[12.5px] text-warn">
                <AlertTriangle className="size-3.5" /> {overdue} article{overdue > 1 ? "s" : ""} past review date.
              </p>
            )}
            <div className="panel relative mt-4 overflow-hidden after:pointer-events-none after:absolute after:inset-y-0 after:right-0 after:w-6 after:rounded-r-lg after:bg-linear-to-l after:from-surface after:to-transparent">
              <div className="overflow-x-auto">
              <table className="w-full min-w-[760px] table-fixed text-[13.5px]">
                <colgroup>
                  <col />
                  <col className="w-[112px]" />
                  <col className="w-[132px]" />
                  <col className="w-[128px]" />
                  <col className="w-[150px]" />
                  <col className="w-[116px]" />
                </colgroup>
                <thead>
                  <tr className="text-left [&>th]:h-9 [&>th]:px-3 [&>th]:whitespace-nowrap">
                    <th className="label">Title</th>
                    <th className="label">Status</th>
                    <th className="label text-right">Views · Helpful</th>
                    <th className="label">Author</th>
                    <th className="label">Folder</th>
                    <th className="label pr-8 text-right">Updated</th>
                  </tr>
                </thead>
                <tbody>
                  {articles.map(({ a, author, folder }) => {
                    const stale = a.reviewDue && new Date(a.reviewDue) < new Date();
                    return (
                      <tr key={a.id} className="row hairline-t">
                        <td className="px-3 py-2">
                          <Link href={`/solutions/${a.id}`} className="flex min-w-0 items-center gap-2 font-medium hover:underline">
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
                        <td className="tnum whitespace-nowrap px-3 py-2 text-right text-ink-2" title={`${a.views} views · ${a.helpful} helpful · ${a.notHelpful} not helpful · used in ${a.insertedInTickets} tickets`}>
                          {a.views} <span className="text-ink-3">·</span> {a.helpful}
                        </td>
                        <td className="truncate whitespace-nowrap px-3 py-2 text-ink-2" title={author ?? undefined}>{author}</td>
                        <td className="truncate whitespace-nowrap px-3 py-2 text-ink-2" title={folder ?? undefined}>{folder}</td>
                        <td className="tnum whitespace-nowrap px-3 py-2 pr-8 text-right text-ink-3">{relTime(a.updatedAt)}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
