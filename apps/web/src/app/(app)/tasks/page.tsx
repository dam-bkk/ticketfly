import Link from "next/link";
import { Check } from "lucide-react";
import { toggleTask } from "@/app/module-actions";
import { requireStaff } from "@/lib/auth";
import { listTasks, taskHref } from "@/lib/modules";
import { cn, dayLabel, relTime } from "@/lib/utils";
import { Topbar } from "@/components/shell/topbar";
import { Avatar } from "@/components/ui/avatar";
import { Empty } from "@/components/ui/empty";

export const metadata = { title: "Tasks" };

const PARENT_LABEL: Record<string, string> = { ticket: "Ticket", change: "Change", problem: "Problem", journey: "Journey", project: "Project" };

export default async function TasksPage({ searchParams }: { searchParams: Promise<{ v?: string }> }) {
  const me = await requireStaff();
  const { v = "mine" } = await searchParams;
  const scope = (["mine", "all", "overdue", "done"].includes(v) ? v : "mine") as "mine" | "all" | "overdue" | "done";
  const { rows, k } = await listTasks({ meId: me.id, scope });
  const groups = new Map<string, typeof rows>();
  for (const r of rows) {
    const key = !r.t.dueAt ? "No due date" : r.t.dueAt < new Date() && r.t.status !== "done" ? "Overdue" : dayLabel(r.t.dueAt);
    groups.set(key, [...(groups.get(key) ?? []), r]);
  }
  const TABS: [string, string, number | undefined][] = [["mine", "My tasks", k.mine], ["all", "All open", k.all], ["overdue", "Overdue", k.overdue], ["done", "Done", undefined]];
  return (
    <>
      <Topbar crumbs={[{ label: "Tasks" }]} />
      <div className="flex h-11 shrink-0 items-center gap-1 bg-surface px-3 hairline-b">
        {TABS.map(([key, label, n]) => (
          <Link key={key} href={`/tasks?v=${key}`} className={cn("flex h-7 items-center gap-1.5 rounded-md px-2.5 text-[12.5px] font-medium text-ink-2 hover:bg-surface-2 hover:text-ink", scope === key && "bg-surface-2 text-ink")}>
            {label}
            {n !== undefined && <span className={cn("tnum text-[11px]", key === "overdue" && n ? "text-crit" : "text-ink-3")}>{n}</span>}
          </Link>
        ))}
        <span className="ml-auto text-[12px] text-ink-3">{k.dueToday} of yours due today or earlier · tasks are created on tickets, changes, problems and journeys</span>
      </div>
      <div className="flex-1 overflow-y-auto">
        <div className="mx-auto max-w-[960px] px-6 py-5 rise">
          {rows.length === 0 ? (
            <Empty title={scope === "mine" ? "Nothing on your list" : "No tasks"} hint="Add tasks from any ticket, problem or change." />
          ) : (
            [...groups.entries()].map(([label, items]) => (
              <section key={label} className="mb-6">
                <p className={cn("label mb-2", label === "Overdue" && "text-crit")}>{label} · {items.length}</p>
                <ul className="panel divide-y divide-line overflow-hidden">
                  {items.map(({ t, assignee, parentTitle }) => {
                    const done = t.status === "done";
                    return (
                      <li key={t.id} className="row flex items-center gap-3 px-4 py-2.5 text-[13px]">
                        <form action={toggleTask.bind(null, t.id, undefined)}>
                          <button type="submit" aria-label={done ? "Reopen" : "Complete"} className={cn("flex size-[18px] items-center justify-center rounded-full transition-colors", done ? "bg-ok text-white" : "border border-line-strong hover:border-ink-3")}>
                            {done && <Check className="size-3" strokeWidth={3} />}
                          </button>
                        </form>
                        <span className={cn("min-w-0 flex-1", done && "text-ink-3 line-through")}>
                          <span className="block truncate font-medium">{t.title}</span>
                          <Link href={taskHref(t.parentType, t.parentId)} className="block truncate text-[12px] text-ink-3 hover:text-ink">
                            {PARENT_LABEL[t.parentType] ?? t.parentType} · {parentTitle ?? `#${t.parentId}`}
                          </Link>
                        </span>
                        {assignee && (
                          <span className="flex items-center gap-1.5 text-[12px] text-ink-3">
                            <Avatar name={assignee} size={18} /> {assignee.split(" ")[0]}
                          </span>
                        )}
                        <span className={cn("tnum w-20 text-right text-[12px]", label === "Overdue" ? "font-medium text-crit" : "text-ink-4")}>{t.dueAt ? relTime(t.dueAt) : "—"}</span>
                      </li>
                    );
                  })}
                </ul>
              </section>
            ))
          )}
        </div>
      </div>
    </>
  );
}
