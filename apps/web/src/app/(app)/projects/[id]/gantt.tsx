import { differenceInCalendarDays, eachWeekOfInterval, format, max, min } from "date-fns";
import type { GridRow } from "./grid";
import { cn } from "@/lib/utils";

export function Gantt({ rows, start, end }: { rows: GridRow[]; start: string | null; end: string | null }) {
  const dated = rows.filter((r) => r.title && r.startDate && r.endDate);
  if (!dated.length) return <p className="p-6 text-[13px] text-ink-3">Add start and end dates in the grid to see the timeline.</p>;
  const from = min([new Date(start ?? dated[0]!.startDate!), ...dated.map((r) => new Date(r.startDate!))]);
  const to = max([new Date(end ?? dated[0]!.endDate!), ...dated.map((r) => new Date(r.endDate!))]);
  const total = Math.max(1, differenceInCalendarDays(to, from) + 1);
  const weeks = eachWeekOfInterval({ start: from, end: to }, { weekStartsOn: 1 });
  const today = differenceInCalendarDays(new Date(), from);
  return (
    <div className="p-4">
      <div className="overflow-x-auto rounded-lg bg-surface hairline">
        <div className="min-w-[900px]">
          <div className="grid" style={{ gridTemplateColumns: "280px 1fr" }}>
            <div className="label px-3 py-2 hairline-b">Task</div>
            <div className="relative h-8 hairline-b">
              {weeks.map((w) => {
                const left = (differenceInCalendarDays(w, from) / total) * 100;
                return (
                  <span key={w.toISOString()} className="absolute top-2 text-[10.5px] text-ink-3" style={{ left: `${left}%` }}>
                    {format(w, "d MMM")}
                  </span>
                );
              })}
            </div>
            {rows.filter((r) => r.title).map((r) => {
              const has = r.startDate && r.endDate;
              const left = has ? (differenceInCalendarDays(new Date(r.startDate!), from) / total) * 100 : 0;
              const width = has ? ((differenceInCalendarDays(new Date(r.endDate!), new Date(r.startDate!)) + 1) / total) * 100 : 0;
              return (
                <div key={r.id} className="contents">
                  <div className={cn("truncate px-3 py-1.5 text-[12.5px] hairline-b", r.parentId ? "pl-7 text-ink-2" : "font-medium")}>{r.title}</div>
                  <div className="relative h-8 hairline-b">
                    {today >= 0 && today <= total && <span className="absolute inset-y-0 w-px bg-crit/60" style={{ left: `${(today / total) * 100}%` }} />}
                    {has && (
                      <span className={cn("absolute top-1.5 h-5 rounded-md", r.status === "done" ? "bg-ok/80" : r.status === "blocked" ? "bg-crit/70" : r.status === "in_progress" ? "bg-accent/80" : "bg-ink-4/60")} style={{ left: `${left}%`, width: `${Math.max(width, 0.8)}%` }} title={`${r.startDate} → ${r.endDate}`}>
                        <span className="absolute inset-y-0 left-0 rounded-md bg-white/30" style={{ width: `${r.percent}%` }} />
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
      <p className="mt-2 text-[11.5px] text-ink-3">Red line = today. Lighter fill inside a bar = % done.</p>
    </div>
  );
}
