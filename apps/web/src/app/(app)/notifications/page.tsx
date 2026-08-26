import Link from "next/link";
import { BellRing, CheckCheck } from "lucide-react";
import { markAllRead, markRead } from "@/app/module-actions";
import { requireStaff } from "@/lib/auth";
import { listNotifications } from "@/lib/modules";
import { cn, dayLabel, relTime } from "@/lib/utils";
import { Topbar } from "@/components/shell/topbar";
import { Button } from "@/components/ui/button";
import { Empty } from "@/components/ui/empty";

export const metadata = { title: "Notifications" };

const KIND_TONE: Record<string, string> = { assignment: "bg-accent", sla: "bg-crit", task: "bg-warn", mention: "bg-violet", approval: "bg-warn", change: "bg-info", release: "bg-ok" };

export default async function NotificationsPage() {
  const me = await requireStaff();
  const rows = await listNotifications(me.id);
  const unread = rows.filter((r) => !r.readAt).length;
  const groups = new Map<string, typeof rows>();
  for (const r of rows) groups.set(dayLabel(r.createdAt), [...(groups.get(dayLabel(r.createdAt)) ?? []), r]);
  return (
    <>
      <Topbar
        crumbs={[{ label: "Notifications" }]}
        actions={
          <form action={markAllRead}>
            <Button type="submit" size="sm" variant="secondary" disabled={!unread}>
              <CheckCheck className="size-3.5" /> Mark all read
            </Button>
          </form>
        }
      />
      <div className="flex-1 overflow-y-auto">
        <div className="mx-auto max-w-[760px] px-6 py-5 rise">
          <p className="mb-4 flex items-center gap-2 text-[13px] text-ink-3">
            <BellRing className="size-3.5" /> {unread ? `${unread} unread` : "All caught up"} · assignments, SLA warnings, approvals, mentions, tasks due. Email and Teams delivery follow the same list.
          </p>
          {rows.length === 0 ? <Empty title="No notifications yet" /> : (
            [...groups.entries()].map(([day, items]) => (
              <section key={day} className="mb-5">
                <p className="label mb-2">{day}</p>
                <ul className="panel divide-y divide-line overflow-hidden">
                  {items.map((n) => (
                    <li key={n.id} className={cn("row flex items-start gap-3 px-4 py-3", !n.readAt && "bg-accent-soft/30")}>
                      <span className={cn("mt-1.5 size-2 shrink-0 rounded-full", KIND_TONE[n.kind] ?? "bg-ink-4")} />
                      <span className="min-w-0 flex-1">
                        <Link href={n.href ?? "#"} className={cn("block text-[13.5px]", !n.readAt ? "font-medium" : "text-ink-2")}>{n.title}</Link>
                        {n.body && <span className="block truncate text-[12.5px] text-ink-3">{n.body}</span>}
                      </span>
                      <span className="text-[12px] text-ink-4">{relTime(n.createdAt)}</span>
                      {!n.readAt && (
                        <form action={markRead.bind(null, n.id)}>
                          <button type="submit" className="text-[12px] text-ink-3 hover:text-ink">Mark read</button>
                        </form>
                      )}
                    </li>
                  ))}
                </ul>
              </section>
            ))
          )}
        </div>
      </div>
    </>
  );
}
