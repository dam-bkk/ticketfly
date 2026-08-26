import Link from "next/link";
import { Check, Plus } from "lucide-react";
import { createTask, toggleTask } from "@/app/module-actions";
import { cn, relTime } from "@/lib/utils";
import { Avatar } from "./avatar";

type Row = { t: { id: number; title: string; status: string; dueAt: Date | null; parentType: string; parentId: number }; assignee: string | null };

/** Tasks attached to any record: one-click complete, inline add. The same component on tickets, problems, changes, projects. */
export function TaskList({ rows, parentType, parentId, back, compact }: { rows: Row[]; parentType: string; parentId: number; back: string; compact?: boolean }) {
  return (
    <div>
      <ul className="space-y-0.5">
        {rows.map(({ t, assignee }) => {
          const done = t.status === "done";
          const overdue = !done && t.dueAt && t.dueAt < new Date();
          return (
            <li key={t.id} className="flex items-center gap-2.5 rounded-md px-1.5 py-1 text-[13px] hover:bg-surface-2">
              <form action={toggleTask.bind(null, t.id, back)}>
                <button type="submit" aria-label={done ? "Reopen" : "Complete"} className={cn("flex size-[18px] items-center justify-center rounded-full transition-colors", done ? "bg-ok text-white" : "border border-line-strong hover:border-ink-3")}>
                  {done && <Check className="size-3" strokeWidth={3} />}
                </button>
              </form>
              <span className={cn("min-w-0 flex-1 truncate", done && "text-ink-3 line-through decoration-line-strong")}>{t.title}</span>
              {assignee && <Avatar name={assignee} size={18} />}
              {t.dueAt && !compact && <span className={cn("tnum w-20 text-right text-[11.5px]", overdue ? "font-medium text-crit" : "text-ink-4")}>{done ? "done" : relTime(t.dueAt)}</span>}
            </li>
          );
        })}
        {rows.length === 0 && <li className="px-1.5 py-2 text-[12.5px] text-ink-3">No tasks yet.</li>}
      </ul>
      <form action={createTask} className="mt-2 flex items-center gap-2">
        <input type="hidden" name="parentType" value={parentType} />
        <input type="hidden" name="parentId" value={parentId} />
        <input type="hidden" name="back" value={back} />
        <input name="title" required placeholder="Add a task…" className="h-8 flex-1 rounded-md bg-surface px-2.5 text-[13px] hairline focus:outline-none focus:shadow-[inset_0_0_0_1px_var(--accent),0_0_0_3px_var(--ring)]" />
        <input type="date" name="dueAt" className="h-8 rounded-md bg-surface px-2 text-[12.5px] hairline" />
        <button type="submit" className="inline-flex size-8 items-center justify-center rounded-md text-ink-3 hairline hover:bg-surface-2 hover:text-ink" aria-label="Add task">
          <Plus className="size-4" />
        </button>
      </form>
      {!compact && (
        <p className="mt-2 text-[11.5px] text-ink-4">
          Also in <Link href="/tasks" className="underline-offset-2 hover:underline">Tasks</Link> for the assignee.
        </p>
      )}
    </div>
  );
}
