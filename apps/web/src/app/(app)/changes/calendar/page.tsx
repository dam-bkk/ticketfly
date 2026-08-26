import Link from "next/link";
import { addDays, addMonths, endOfMonth, endOfWeek, format, isSameDay, isSameMonth, startOfMonth, startOfWeek } from "date-fns";
import { requireStaff } from "@/lib/auth";
import { changeCalendar } from "@/lib/modules";
import { cn } from "@/lib/utils";
import { Topbar } from "@/components/shell/topbar";
import { ButtonLink } from "@/components/ui/button";

export const metadata = { title: "Change calendar" };

export default async function ChangeCalendar({ searchParams }: { searchParams: Promise<{ m?: string }> }) {
  await requireStaff();
  const { m } = await searchParams;
  const month = m ? new Date(`${m}-01T00:00:00`) : startOfMonth(new Date());
  const from = startOfWeek(startOfMonth(month), { weekStartsOn: 1 });
  const to = endOfWeek(endOfMonth(month), { weekStartsOn: 1 });
  const changes = await changeCalendar(from, to);
  const days: Date[] = [];
  for (let d = from; d <= to; d = addDays(d, 1)) days.push(d);
  const freeze = (d: Date) => d.getDate() >= 28 || d.getDate() <= 2; // month-end freeze window (Finance close)
  return (
    <>
      <Topbar crumbs={[{ label: "Changes", href: "/changes" }, { label: "Calendar" }]} />
      <div className="flex-1 overflow-y-auto">
        <div className="mx-auto max-w-[1180px] px-6 py-5 rise">
          <div className="flex items-center gap-3">
            <ButtonLink href={`/changes/calendar?m=${format(addMonths(month, -1), "yyyy-MM")}`} variant="ghost" size="sm">‹</ButtonLink>
            <h1 className="text-[18px] font-semibold tracking-[-0.01em]">{format(month, "MMMM yyyy")}</h1>
            <ButtonLink href={`/changes/calendar?m=${format(addMonths(month, 1), "yyyy-MM")}`} variant="ghost" size="sm">›</ButtonLink>
            <span className="ml-auto flex items-center gap-3 text-[12px] text-ink-3">
              <span className="flex items-center gap-1.5"><i className="size-2 rounded-sm bg-accent" /> Normal</span>
              <span className="flex items-center gap-1.5"><i className="size-2 rounded-sm bg-ok" /> Standard</span>
              <span className="flex items-center gap-1.5"><i className="size-2 rounded-sm bg-crit" /> Emergency</span>
              <span className="flex items-center gap-1.5"><i className="size-2 rounded-sm bg-warn-soft ring-1 ring-warn" /> Month-end freeze</span>
            </span>
          </div>
          <div className="panel mt-4 overflow-hidden">
            <div className="grid grid-cols-7 bg-surface-2 text-center">
              {["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].map((d) => (
                <div key={d} className="label py-2">{d}</div>
              ))}
            </div>
            <div className="grid grid-cols-7">
              {days.map((d) => {
                const items = changes.filter((c) => c.plannedStart && isSameDay(c.plannedStart, d));
                return (
                  <div key={d.toISOString()} className={cn("min-h-[96px] p-1.5 hairline-t hairline-r", !isSameMonth(d, month) && "bg-surface-2/50 text-ink-3", freeze(d) && isSameMonth(d, month) && "bg-warn-soft/40")}>
                    <p className={cn("tnum text-[11.5px]", isSameDay(d, new Date()) && "font-semibold text-accent-ink")}>{format(d, "d")}</p>
                    <ul className="mt-1 space-y-0.5">
                      {items.map((c) => (
                        <li key={c.id}>
                          <Link href={`/changes/${c.id}`} className={cn("block truncate rounded px-1.5 py-0.5 text-[11px] font-medium text-white", c.type === "emergency" ? "bg-crit" : c.type === "standard" ? "bg-ok" : "bg-accent", (c.status === "closed" || c.status === "completed") && "opacity-50")} title={c.title}>
                            {format(c.plannedStart!, "HH:mm")} {c.title}
                          </Link>
                        </li>
                      ))}
                    </ul>
                  </div>
                );
              })}
            </div>
          </div>
          <p className="mt-3 text-[12px] text-ink-3">Freeze windows block normal changes on the 28th–2nd (Finance close). Emergency changes can still be raised and are reviewed after.</p>
        </div>
      </div>
    </>
  );
}
