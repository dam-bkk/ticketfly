import Link from "next/link";
import { Download } from "lucide-react";
import { format } from "date-fns";
import { requireStaff } from "@/lib/auth";
import { activityLogPage } from "@/lib/queries";
import { cn } from "@/lib/utils";
import { Avatar } from "@/components/ui/avatar";
import { ButtonLink } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

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

const fmt = (v: unknown): string => {
  if (v === null || v === undefined || v === "") return "—";
  if (typeof v === "string") return v.length > 40 ? v.slice(0, 39) + "…" : v;
  if (typeof v === "number" || typeof v === "boolean") return String(v);
  if (Array.isArray(v)) return v.length ? v.map(fmt).join(", ") : "—";
  return JSON.stringify(v);
};

/** "field: old → new" per changed key; keys present only in `after` render as "field: value". */
function summarize(before: unknown, after: unknown): string[] {
  const b = before && typeof before === "object" && !Array.isArray(before) ? (before as Record<string, unknown>) : null;
  const a = after && typeof after === "object" && !Array.isArray(after) ? (after as Record<string, unknown>) : null;
  if (!b && !a) return before || after ? [`${fmt(before)}${before && after ? " → " : ""}${after ? fmt(after) : ""}`] : [];
  const keys = [...new Set([...Object.keys(b ?? {}), ...Object.keys(a ?? {})])];
  return keys.map((k) => (b && a && k in b && k in a ? `${k}: ${fmt(b[k])} → ${fmt(a[k])}` : b && k in b && !(a && k in a) ? `${k}: ${fmt(b[k])} → —` : `${k}: ${fmt(a?.[k])}`));
}

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
          <h1 className="text-[22px] font-semibold tracking-[-0.01em]">Activity log</h1>
          <p className="text-[13.5px] text-ink-3">Every change, by whom, from where. Append-only — rows are never edited or deleted.</p>
        </div>
        <ButtonLink href="/api/activity.csv" variant="secondary">
          <Download className="size-3.5" /> Export CSV
        </ButtonLink>
      </div>

      <div className="mt-5 flex items-center gap-2">
        <form className="flex items-center gap-2">
          {sp.category && <input type="hidden" name="category" value={sp.category} />}
          <Input name="q" defaultValue={sp.q} placeholder="Search actor, action, target, IP" className="h-8 w-72" />
        </form>
        <div className="ml-2 flex flex-wrap gap-1">
          <Link href="/admin/activity" className={cn("h-7 rounded-md px-2.5 text-[12.5px] font-medium leading-7 text-ink-2 hover:bg-surface-2", !sp.category && "bg-surface-2 text-ink")}>
            All <span className="tnum text-ink-3">{cats.reduce((a, c) => a + Number(c.n), 0)}</span>
          </Link>
          {cats.map((c) => (
            <Link key={c.category} href={`/admin/activity?category=${c.category}`} className={cn("h-7 rounded-md px-2.5 text-[12.5px] font-medium capitalize leading-7 text-ink-2 hover:bg-surface-2", sp.category === c.category && "bg-surface-2 text-ink")}>
              {c.category} <span className="tnum text-ink-3">{c.n}</span>
            </Link>
          ))}
        </div>
      </div>

      <div className="panel mt-3 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[900px] table-fixed text-[12.5px]">
            <colgroup>
              <col className="w-[150px]" />
              <col className="w-[132px]" />
              <col className="w-[150px]" />
              <col className="w-[88px]" />
              <col className="w-[112px]" />
              <col />
              <col className="w-[128px]" />
            </colgroup>
            <thead>
              <tr className="text-left [&>th]:h-9 [&>th]:whitespace-nowrap [&>th]:px-3">
                <th className="label">Timestamp</th>
                <th className="label">Who</th>
                <th className="label">Activity</th>
                <th className="label">Category</th>
                <th className="label">Target</th>
                <th className="label">Change</th>
                <th className="label">Origin</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => {
                const lines = summarize(r.before, r.after);
                const full = [r.before ? `before: ${JSON.stringify(r.before)}` : null, r.after ? `after: ${JSON.stringify(r.after)}` : null].filter(Boolean).join("\n");
                const target = r.targetType === "ticket" ? `ticket #${r.targetId}` : `${r.targetType ?? ""} ${r.targetId ?? ""}`.trim();
                return (
                  <tr key={r.id} className="row hairline-t align-middle [&>td]:h-10">
                    <td className="tnum whitespace-nowrap px-3 py-1.5 font-mono text-[11px] text-ink-2" title={format(r.ts, "yyyy-MM-dd HH:mm:ss.SSS")}>{format(r.ts, "yyyy-MM-dd HH:mm:ss")}</td>
                    <td className="px-3 py-1.5">
                      <span className="flex items-center gap-2">
                        {r.actorType === "user" ? <Avatar name={r.actorName} size={18} /> : <span className="inline-block size-[18px] shrink-0 rounded-full bg-surface-3" />}
                        <span className="truncate whitespace-nowrap">{r.actorName}</span>
                      </span>
                    </td>
                    <td className="truncate whitespace-nowrap px-3 py-1.5 font-mono text-[11px]" title={r.action}>{r.action}</td>
                    <td className="px-3 py-1.5">
                      <span className={cn("rounded px-1.5 py-0.5 text-[11px] font-medium capitalize", CAT_TONE[r.category] ?? CAT_TONE.system)}>{r.category}</span>
                    </td>
                    <td className="truncate whitespace-nowrap px-3 py-1.5 font-mono text-[11px] text-ink-2" title={target}>
                      {r.targetType === "ticket" ? (
                        <Link href={`/tickets/${r.targetId}`} className="hover:underline">{target}</Link>
                      ) : (
                        target || "—"
                      )}
                    </td>
                    <td className="px-3 py-1.5 text-[11px] text-ink-2">
                      {lines.length ? (
                        <span className="line-clamp-2 leading-[16px] break-words" title={full}>
                          {lines.map((l, i) => (
                            <span key={i}>
                              {i > 0 && <span className="text-ink-3"> · </span>}
                              {l}
                            </span>
                          ))}
                        </span>
                      ) : (
                        <span className="text-ink-3">—</span>
                      )}
                    </td>
                    <td className="truncate whitespace-nowrap px-3 py-1.5 font-mono text-[11px] text-ink-3" title={`IP ${r.ip ?? "—"} · release ${r.release ?? "—"}`}>
                      {r.ip ?? "—"}
                      {r.release ? <span className="text-ink-3"> · {r.release}</span> : null}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        <div className="flex items-center justify-between px-3 py-2 text-[12.5px] text-ink-3 hairline-t">
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
