import Link from "next/link";
import { differenceInCalendarDays } from "date-fns";
import { AlertTriangle, ArrowRight } from "lucide-react";
import { requireStaff } from "@/lib/auth";
import { listOnboardings } from "@/lib/queries";
import { cn } from "@/lib/utils";
import { Topbar } from "@/components/shell/topbar";
import { Avatar } from "@/components/ui/avatar";
import { ButtonLink } from "@/components/ui/button";
import { Tone } from "@/components/ui/pills";
import { TaskList } from "./onboarding/task-list";

export async function JourneysBoard({ kind }: { kind: "onboarding" | "offboarding" }) {
  await requireStaff();
  const rows = await listOnboardings();
  const joiners = rows.filter((r) => r.o.kind === "onboarding");
  const leavers = rows.filter((r) => r.o.kind === "offboarding");
  const today = new Date();
  const overdueLeavers = leavers.filter((r) => differenceInCalendarDays(today, new Date(r.o.joinDate)) > 0 && r.o.tasks.some((t) => t.status !== "done"));

  return (
    <>
      <Topbar
        crumbs={[{ label: "Journeys" }, { label: kind === "onboarding" ? "Onboarding" : "Offboarding" }]}
        actions={
          <ButtonLink href={kind === "onboarding" ? "/portal/new/new-starter" : "/portal/new/leaver"} variant="secondary">
            {kind === "onboarding" ? "New starter" : "New leaver"}
          </ButtonLink>
        }
      />
      <div className="flex-1 overflow-y-auto">
        <div className="mx-auto max-w-[1180px] px-6 py-6 rise">
          <div className="flex items-end justify-between gap-4">
            <div>
              <h1 className="text-[20px] font-semibold tracking-[-0.01em]">{kind === "onboarding" ? "Employee onboarding" : "Employee offboarding"}</h1>
              <p className="text-[13px] text-ink-3">{kind === "onboarding" ? "One request from HR fans out to every team. Accounts and licences ready five working days before day one." : "Scheduled from the last day: sign-in disabled, every grant on the person record revoked, devices back, HR told when it is done."}</p>
            </div>
            <nav className="flex gap-1 rounded-lg bg-surface-2 p-1">
              <Link href="/journeys/onboarding" className={cn("h-7 rounded-md px-3 text-[12.5px] font-medium leading-7 text-ink-2", kind === "onboarding" ? "bg-surface text-ink shadow-1" : "hover:text-ink")}>Onboarding</Link>
              <Link href="/journeys/offboarding" className={cn("h-7 rounded-md px-3 text-[12.5px] font-medium leading-7 text-ink-2", kind === "offboarding" ? "bg-surface text-ink shadow-1" : "hover:text-ink")}>Offboarding</Link>
            </nav>
          </div>

          {kind === "offboarding" && overdueLeavers.length > 0 && (
            <div className="mt-5 flex items-center gap-3 rounded-lg bg-crit-soft px-4 py-3 text-[13px] text-crit">
              <AlertTriangle className="size-4 shrink-0" />
              <span>
                <strong>{overdueLeavers.length} leaver{overdueLeavers.length > 1 ? "s" : ""} past last day with access still active</strong> — {overdueLeavers.map((r) => r.person.displayName).join(", ")}. HR was alerted by the offboarding watchdog at 08:00.
              </span>
            </div>
          )}

          <div className="mt-6 grid gap-6 xl:grid-cols-2">
            {kind === "onboarding" ? <Column title="Joining" hint="Countdown to day one" items={joiners} kind="onboarding" /> : <Column title="Leaving" hint="Countdown to last day" items={leavers} kind="offboarding" />}
            <aside className="space-y-3">
              <div className="panel p-4">
                <p className="label mb-2">How it works</p>
                <ol className="list-decimal space-y-1.5 pl-4 text-[13px] text-ink-2">
                  {kind === "onboarding" ? ["HR raises New starter from the portal — join date, role, and a colleague to clone access from.", "IT reviews the resolved access list once; every grant is recorded on the person record.", "Account and licences are created at join − 5 working days; laptop shipped at − 3.", "Day one: activation email with the welcome pack; requester acknowledges the laptop in the portal."].map((s) => <li key={s}>{s}</li>) : ["HR (or the manager) raises Leaver with the last working day.", "Devices are recalled; the requester confirms return from the portal.", "On the last day: sign-in disabled, sessions revoked, every grant removed in reverse.", "Watchdog alerts HR and IT if anything is still active 24 h later."].map((s) => <li key={s}>{s}</li>)}
                </ol>
              </div>
              <div className="panel p-4">
                <p className="label mb-2">Replaces in Freshservice</p>
                <p className="text-[13px] text-ink-2">Admin → Service Request Management → {kind === "onboarding" ? "Employee Onboarding" : "Employee Offboarding"}, plus the RFI and COPE forms that lived outside the tool.</p>
              </div>
            </aside>
          </div>
        </div>
      </div>
    </>
  );
}

function Column({ title, hint, items, kind }: { title: string; hint: string; items: Awaited<ReturnType<typeof listOnboardings>>; kind: "onboarding" | "offboarding" }) {
  return (
    <section>
      <div className="mb-3 flex items-baseline gap-2">
        <h2 className="text-[15px] font-semibold">{title}</h2>
        <span className="text-[12px] text-ink-3">{hint}</span>
        <span className="tnum ml-auto text-[12px] text-ink-3">{items.length}</span>
      </div>
      <div className="space-y-3">
        {items.length === 0 && <p className="panel p-6 text-center text-[13px] text-ink-3">Nothing scheduled.</p>}
        {items.map(({ o, person }) => {
          const days = differenceInCalendarDays(new Date(o.joinDate), new Date());
          const done = o.tasks.filter((t) => t.status === "done").length;
          const overdue = kind === "offboarding" && days < 0 && done < o.tasks.length;
          return (
            <article key={o.id} className="panel p-4">
              <div className="flex items-start gap-3">
                <Avatar name={person.displayName} size={36} />
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <Link href={`/people/${person.id}`} className="truncate text-[14px] font-medium hover:underline">
                      {person.displayName}
                    </Link>
                    <Tone tone={overdue ? "crit" : o.stage === "ready" ? "ok" : o.stage === "blocked" ? "crit" : "info"} className="capitalize">
                      {overdue ? "Overdue" : o.stage}
                    </Tone>
                  </div>
                  <p className="truncate text-[12.5px] text-ink-3">
                    {person.jobTitle} · {person.department} · {person.officeLocation}
                  </p>
                </div>
                <div className="text-right">
                  <p className={cn("tnum text-[22px] font-semibold leading-none tracking-[-0.02em]", days < 0 ? "text-crit" : days <= 5 ? "text-warn" : "")}>{days === 0 ? "Today" : days < 0 ? `${-days}d ago` : `${days}d`}</p>
                  <p className="mt-1 text-[11px] text-ink-3">{o.joinDate}</p>
                </div>
              </div>
              <div className="mt-3">
                <TaskList onboardingId={o.id} tasks={o.tasks} joinDate={o.joinDate} compact />
              </div>
              {o.ticketId && (
                <Link href={`/tickets/${o.ticketId}`} className="mt-2 inline-flex items-center gap-1 text-[12px] text-ink-3 hover:text-ink">
                  Open the {kind} ticket <ArrowRight className="size-3" />
                </Link>
              )}
            </article>
          );
        })}
      </div>
    </section>
  );
}
