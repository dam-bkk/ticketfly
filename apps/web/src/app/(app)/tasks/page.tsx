import Link from "next/link";
import { Check } from "lucide-react";
import { toggleTask } from "@/app/module-actions";
import { requireStaff } from "@/lib/auth";
import { listTasks, taskHref } from "@/lib/modules";
import { taskCounts } from "@/lib/queries";
import { cn, dayLabel, relTime } from "@/lib/utils";
import { Topbar } from "@/components/shell/topbar";
import { Avatar } from "@/components/ui/avatar";
import { ButtonLink } from "@/components/ui/button";
import { Empty } from "@/components/ui/empty";

export const metadata = { title: "Tasks" };

const PARENT_LABEL: Record<string, string> = { ticket: "Ticket", change: "Change", problem: "Problem", journey: "Journey", project: "Project" };

export default async function TasksPage({ searchParams }: { searchParams: Promise<{ v?: string }> }) {
  const me = await requireStaff();
  const { v = "mine" } = await searchParams;
  const scope = (["mine", "all", "overdue", "done"].includes(v) ? v : "mine") as "mine" | "all" | "overdue" | "done";
  // Tab numbers come from the same selector as the sidebar badge (lib/queries.ts → taskCounts).
  const [{ rows }, k] = await Promise.all([listTasks({ meId: me.id, scope }), taskCounts(me.id)]);
  const groups = new Map<string, typeof rows>();
  for (const r of rows) {
    const key = !r.t.dueAt ? "No due date" : r.t.dueAt < new Date() && r.t.status !== "done" ? "Overdue" : dayLabel(r.t.dueAt);
    groups.set(key, [...(groups.get(key) ?? []), r]);
  }
  const TABS: [string, string, number | undefined][] = [["mine", "My tasks", k.mine], ["all", "All open", k.all], ["overdue", "Overdue", k.overdue], ["done", "Done", undefined]];
  const pickUp = <ButtonLink href="/tickets?f=unassigned" size="sm" variant="primary">Pick up an unassigned ticket</ButtonLink>;
  return (
    <>
      <Topbar crumbs={[{ label: "Tasks" }]} />
      <div className="flex h-11 shrink-0 items-center gap-1 bg-surface px-4 hairline-b">
        {TABS.map(([key, label, n]) => (
          <Link key={key} href={`/tasks?v=${key}`} className={cn("flex h-7 items-center gap-1.5 rounded-md px-2 text-[12.5px] font-medium text-ink-2 hover:bg-surface-2 hover:text-ink", scope === key && "bg-surface-2 text-ink")}>
            {label}
            {n !== undefined && <span className={cn("tnum text-[11px]", key === "overdue" && n ? "text-crit" : "text-ink-3")}>{n}</span>}
          </Link>
        ))}
        <span className="ml-auto text-[12.5px] text-ink-3">{k.dueToday} of yours due today or earlier</span>
      </div>
      <div className="flex-1 overflow-y-auto">
        <div className="mx-auto max-w-[960px] space-y-3 px-6 py-4 rise">
          {rows.length === 0 ? (
            <Empty
              title={scope === "mine" ? "Nothing on your list" : scope === "overdue" ? "Nothing overdue" : scope === "done" ? "No completed tasks yet" : "No open tasks"}
              hint="Tasks are created on tickets, changes, problems and journeys — there is no standalone task. Open one of those records and add a task from its Tasks panel."
              action={pickUp}
            />
          ) : (
            <>
              {[...groups.entries()].map(([label, items]) => (
                <section key={label}>
                  <p className={cn("label mb-2", label === "Overdue" && "text-crit")}>{label} · {items.length}</p>
                  <ul className="panel divide-y divide-line overflow-hidden">
                    {items.map(({ t, assignee, parentTitle }) => {
                      const done = t.status === "done";
                      return (
                        <li key={t.id} className="row flex items-center gap-3 px-4 py-2 text-[13.5px]">
                          <form action={toggleTask.bind(null, t.id, undefined)}>
                            <button type="submit" aria-label={done ? "Reopen" : "Complete"} className={cn("flex size-[18px] items-center justify-center rounded-full transition-colors", done ? "bg-ok text-white" : "border border-line-strong hover:border-ink-3")}>
                              {done && <Check className="size-3" strokeWidth={3} />}
                            </button>
                          </form>
                          <span className={cn("min-w-0 flex-1", done && "text-ink-3 line-through")}>
                            <span className="block truncate font-medium">{t.title}</span>
                            <Link href={taskHref(t.parentType, t.parentId)} className="block truncate text-[12.5px] text-ink-3 hover:text-ink">
                              {PARENT_LABEL[t.parentType] ?? t.parentType} · {parentTitle ?? `#${t.parentId}`}
                            </Link>
                          </span>
                          {assignee && (
                            <span className="flex items-center gap-1.5 text-[12.5px] text-ink-3">
                              <Avatar name={assignee} size={18} /> {assignee.split(" ")[0]}
                            </span>
                          )}
                          <span className={cn("tnum w-20 text-right text-[12.5px]", label === "Overdue" ? "font-medium text-crit" : "text-ink-3")}>{t.dueAt ? relTime(t.dueAt) : "—"}</span>
                        </li>
                      );
                    })}
                  </ul>
                </section>
              ))}
              <div className="flex flex-wrap items-center gap-3 rounded-lg px-4 py-2 text-[12.5px] text-ink-3 hairline">
                <span>Tasks are created on tickets, changes, problems and journeys. Tick one to complete it; click the parent to open the record.</span>
                <span className="ml-auto">{pickUp}</span>
              </div>
            </>
          )}
        </div>
      </div>
    </>
  );
}
