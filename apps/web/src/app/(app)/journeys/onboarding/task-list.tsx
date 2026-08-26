"use client";

import { useTransition } from "react";
import { Check } from "lucide-react";
import { addDays, format, isBefore } from "date-fns";
import { toggleOnboardingTask } from "@/app/actions";
import { cn } from "@/lib/utils";
import type { OnboardingTask } from "@ticketfly/db";

export function TaskList({ onboardingId, tasks, joinDate, compact }: { onboardingId: number; tasks: OnboardingTask[]; joinDate: string; compact?: boolean }) {
  const [pending, start] = useTransition();
  const join = new Date(joinDate);
  const done = tasks.filter((t) => t.status === "done").length;
  return (
    <div aria-busy={pending}>
      {!compact && (
        <div className="mb-3 flex items-center gap-3">
          <span className="bar flex-1">
            <i style={{ width: `${(done / tasks.length) * 100}%`, background: done === tasks.length ? "var(--ok)" : undefined }} />
          </span>
          <span className="tnum text-[12.5px] text-ink-3">
            {done} / {tasks.length}
          </span>
        </div>
      )}
      <ul className={cn("space-y-0.5", compact && "space-y-0")}>
        {tasks.map((t) => {
          const due = addDays(join, t.dueOffsetDays);
          const overdue = t.status !== "done" && isBefore(due, new Date());
          return (
            <li key={t.key}>
              <button onClick={() => start(() => toggleOnboardingTask(onboardingId, t.key))} className={cn("group flex w-full items-center gap-3 rounded-md px-2 py-2 text-left text-[13.5px] transition-colors hover:bg-surface-2", compact && "py-1")}>
                <span className={cn("flex size-[18px] shrink-0 items-center justify-center rounded-full transition-colors", t.status === "done" ? "bg-ok text-white" : t.status === "in_progress" ? "border-2 border-accent" : t.status === "blocked" ? "border-2 border-crit" : "border border-line-strong group-hover:border-ink-3")}>
                  {t.status === "done" && <Check className="size-3" strokeWidth={3} />}
                  {t.status === "in_progress" && <span className="size-1.5 rounded-full bg-accent" />}
                </span>
                <span className={cn("min-w-0 flex-1 truncate", t.status === "done" && "text-ink-3 line-through decoration-line-strong")}>{t.label}</span>
                <span className="hidden text-[11.5px] text-ink-3 sm:inline">{t.owner}</span>
                <span className={cn("tnum w-16 text-right text-[11px]", overdue ? "font-medium text-crit" : "text-ink-3")}>{t.dueOffsetDays === 0 ? "Day 1" : `${t.dueOffsetDays > 0 ? "+" : ""}${t.dueOffsetDays}d`}</span>
                {!compact && <span className="tnum w-14 text-right text-[11px] text-ink-3">{format(due, "d MMM")}</span>}
              </button>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
