import Link from "next/link";
import { Download } from "lucide-react";
import { format } from "date-fns";
import { requireStaff } from "@/lib/auth";
import { activityLogPage } from "@/lib/queries";
import { cn } from "@/lib/utils";
import { Avatar } from "@/components/ui/avatar";
import { ButtonLink } from "@/components/ui/button";

export const metadata = { title: "Activity log" };

const CAT_TONE: Record<string, string> = {
  ticket: "bg-accent-soft text-accent-ink",
  asset: "bg-info-soft text-info",
  person: "bg-violet-soft text-violet",
  access: "bg-warn-soft text-warn",
  workflow: "bg-violet-soft text-violet",
  settings: "bg-surface-2 text-ink-2",
  auth: "bg-ok-soft text-ok",
  integration: "bg-surface-2 text-ink-2",
  system: "bg-surface-2 text-ink-2",
};

export default async function ActivityPage({ searchParams }: { searchParams: Promise<{ category?: string; q?: string; page?: string }> }) {
  await requireStaff();
  const sp = await searchParams;
  const page = Number(sp.page ?? 1);
  const { rows, total, pageSize, cats } = await activityLogPage({ category: sp.category, q: sp.q, page });
  const pages = Math.max(1, Math.ceil(total / pageSize));
  const qs = (p: number) => `/admin/activity?${new URLSearchParams({ ...(sp.category ? { category: sp.category } : {}), ...(sp.q ? { q: sp.q } : {}), page: String(p) })}`;

  return (
    <div>
      <div className="flex items-end justify-between gap-4">
        <div>
          <h1 className="text-[20px] font-semibold tracking-[-0.01em]">Activity log</h1>
          <p className="text-[13px] text-ink-3">Every change, by whom, from where. Append-only — rows are never edited or deleted.</p>
        </div>
        <ButtonLink href="/api/activity.csv" variant="secondary">
          <Download className="size-3.5" /> Export CSV
        </ButtonLink>
      </div>

      <div className="mt-5 flex items-center gap-2">
        <form className="flex items-center gap-2">
          {sp.category && <input type="hidden" name="category" value={sp.category} />}
          <input name="q" defaultValue={sp.q} placeholder="Search actor, action, target, IP" className="h-8 w-72 rounded-md bg-surface px-3 text-[13px] hairline focus:outline-none focus:shadow-[inset_0_0_0_1px_var(--accent),0_0_0_3px_var(--ring)]" />
        </form>
        <div className="ml-2 flex flex-wrap gap-1">
          <Link href="/admin/activity" className={cn("h-7 rounded-md px-2.5 text-[12.5px] font-medium leading-7 text-ink-2 hover:bg-surface-2", !sp.category && "bg-surface-2 text-ink")}>
            All <span className="tnum text-ink-4">{cats.reduce((a, c) => a + Number(c.n), 0)}</span>
          </Link>
          {cats.map((c) => (
            <Link key={c.category} href={`/admin/activity?category=${c.category}`} className={cn("h-7 rounded-md px-2.5 text-[12.5px] font-medium capitalize leading-7 text-ink-2 hover:bg-surface-2", sp.category === c.category && "bg-surface-2 text-ink")}>
              {c.category} <span className="tnum text-ink-4">{c.n}</span>
            </Link>
          ))}
        </div>
      </div>

      <div className="panel mt-3 overflow-hidden">
        <div className="overflow-x-auto">
        <table className="w-full min-w-[1100px] text-[12.5px]">
          <thead>
            <tr className="text-left [&>th]:h-9 [&>th]:px-3">
              <th className="label">Timestamp</th>
              <th className="label">Who</th>
              <th className="label">Activity</th>
              <th className="label">Category</th>
              <th className="label">Target</th>
              <th className="label">Change</th>
              <th className="label">IP address</th>
              <th className="label">Release</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.id} className="row hairline-t align-top">
                <td className="tnum whitespace-nowrap px-3 py-2 font-mono text-[11.5px] text-ink-2">{format(r.ts, "yyyy-MM-dd HH:mm:ss.SSS")}</td>
                <td className="px-3 py-2">
                  <span className="flex items-center gap-2">
                    {r.actorType === "user" ? <Avatar name={r.actorName} size={18} /> : <span className="inline-block size-[18px] rounded-full bg-surface-3" />}
                    <span className="whitespace-nowrap">{r.actorName}</span>
                  </span>
                </td>
                <td className="px-3 py-2 font-mono text-[11.5px]">{r.action}</td>
                <td className="px-3 py-2">
                  <span className={cn("rounded px-1.5 py-0.5 text-[11px] font-medium capitalize", CAT_TONE[r.category] ?? CAT_TONE.system)}>{r.category}</span>
                </td>
                <td className="px-3 py-2 text-ink-2">
                  {r.targetType === "ticket" ? (
                    <Link href={`/tickets/${r.targetId}`} className="font-mono text-[11.5px] hover:underline">
                      TF-{String(r.targetId).padStart(6, "0")}
                    </Link>
                  ) : (
                    <span className="font-mono text-[11.5px]">
                      {r.targetType} {r.targetId}
                    </span>
                  )}
                </td>
                <td className="px-3 py-2 font-mono text-[11px] text-ink-3">
                  {r.before || r.after ? (
                    <span>
                      {r.before ? <span className="text-crit/80">{JSON.stringify(r.before)}</span> : null}
                      {r.before && r.after ? " → " : null}
                      {r.after ? <span className="text-ok">{JSON.stringify(r.after)}</span> : null}
                    </span>
                  ) : (
                    "—"
                  )}
                </td>
                <td className="px-3 py-2 font-mono text-[11.5px] text-ink-3">{r.ip ?? "—"}</td>
                <td className="px-3 py-2 font-mono text-[11.5px] text-ink-3">{r.release ?? "—"}</td>
              </tr>
            ))}
          </tbody>
        </table>
        </div>
        <div className="flex items-center justify-between px-3 py-2 text-[12px] text-ink-3 hairline-t">
          <span className="tnum">
            {(page - 1) * pageSize + 1}–{Math.min(page * pageSize, total)} of {total}
          </span>
          <span className="flex gap-1">
            {page > 1 && (
              <Link href={qs(page - 1)} className="rounded-md px-2 py-1 hover:bg-surface-2">
                Previous
              </Link>
            )}
            {page < pages && (
              <Link href={qs(page + 1)} className="rounded-md px-2 py-1 hover:bg-surface-2">
                Next
              </Link>
            )}
          </span>
        </div>
      </div>
    </div>
  );
}
