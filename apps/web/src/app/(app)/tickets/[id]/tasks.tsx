import Link from "next/link";
import { Check, Plus } from "lucide-react";
import { createTask, toggleTask } from "@/app/module-actions";
import { cn, relTime } from "@/lib/utils";
import { Avatar } from "@/components/ui/avatar";
import { Input } from "@/components/ui/input";

type Row = { t: { id: number; title: string; status: string; dueAt: Date | null; parentType: string; parentId: number }; assignee: string | null };

/**
 * Tasks attached to a record (ticket / problem / change). Same anatomy as components/ui/task-list,
 * but the add row goes through the styled Input and is sized to never exceed its column:
 * every flex child carries min-w-0, the date field has a fixed width, the row never wraps.
 */
export function RecordTasks({ rows, parentType, parentId, back, compact }: { rows: Row[]; parentType: string; parentId: number; back: string; compact?: boolean }) {
  return (
    <div className="w-full min-w-0">
      <ul className="space-y-0.5">
        {rows.map(({ t, assignee }) => {
          const done = t.status === "done";
          const overdue = !done && t.dueAt && t.dueAt < new Date();
          return (
            <li key={t.id} className="flex min-w-0 items-center gap-2.5 rounded-md px-1.5 py-1 text-[13px] hover:bg-surface-2">
              <form action={toggleTask.bind(null, t.id, back)} className="shrink-0">
                <button type="submit" aria-label={done ? "Reopen" : "Complete"} className={cn("flex size-[18px] items-center justify-center rounded-full transition-colors", done ? "bg-ok text-white" : "border border-line-strong hover:border-ink-3")}>
                  {done && <Check className="size-3" strokeWidth={3} />}
                </button>
              </form>
              <span className={cn("min-w-0 flex-1 truncate", done && "text-ink-3 line-through decoration-line-strong")}>{t.title}</span>
              {assignee && <Avatar name={assignee} size={18} className="shrink-0" />}
              {t.dueAt && <span className={cn("tnum shrink-0 text-[11px]", compact ? "" : "w-20 text-right", overdue ? "font-medium text-crit" : "text-ink-3")}>{done ? "done" : relTime(t.dueAt)}</span>}
            </li>
          );
        })}
        {rows.length === 0 && <li className="px-1.5 py-2 text-[12.5px] text-ink-3">No tasks yet.</li>}
      </ul>
      <form action={createTask} className="mt-2 flex w-full min-w-0 items-center gap-2">
        <input type="hidden" name="parentType" value={parentType} />
        <input type="hidden" name="parentId" value={parentId} />
        <input type="hidden" name="back" value={back} />
        <Input name="title" required placeholder="Add a task…" aria-label="Task title" className="h-8 min-w-0 flex-1 text-[13px]" />
        <Input type="date" name="dueAt" aria-label="Due date" className={cn("h-8 shrink-0 px-2 text-[12.5px]", compact ? "w-[118px]" : "w-[136px]")} />
        <button type="submit" className="inline-flex size-8 shrink-0 items-center justify-center rounded-md text-ink-3 hairline hover:bg-surface-2 hover:text-ink" aria-label="Add task">
          <Plus className="size-4" />
        </button>
      </form>
      {!compact && (
        <p className="mt-2 text-[11px] text-ink-3">
          Also in <Link href="/tasks" className="underline-offset-2 hover:underline">Tasks</Link> for the assignee.
        </p>
      )}
    </div>
  );
}
