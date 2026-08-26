import Link from "next/link";
import { notFound } from "next/navigation";
import { Play } from "lucide-react";
import { transitionChange } from "@/app/module-actions";
import { requireStaff } from "@/lib/auth";
import { getChange } from "@/lib/modules";
import { longTime, relTime } from "@/lib/utils";
import { Topbar } from "@/components/shell/topbar";
import { Avatar } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { PriorityMark, Tone } from "@/components/ui/pills";
import { Block, CHANGE_STATUS_LABEL, NextStep, PROBLEM_STATUS_LABEL, Prop, RecordHeader, RISK_TONE } from "@/components/ui/record";
import { RecordTasks } from "@/app/(app)/tickets/[id]/tasks";
import { ApprovalActions } from "./approval-actions";

const STEPS = ["planning", "awaiting_approval", "approved", "in_progress", "completed", "closed"];

export default async function ChangePage({ params }: { params: Promise<{ id: string }> }) {
  const me = await requireStaff();
  const { id } = await params;
  const data = await getChange(Number(id));
  if (!data) notFound();
  const { c, requester, assignee, group, release, tasks, problems, assets, activity, services } = data;
  const back = `/changes/${c.id}`;
  const myApproval = c.approvals.find((a) => a.personId === me.id);
  const myTurn = c.status === "awaiting_approval" && myApproval?.decision === "pending";
  const allApproved = c.approvals.length > 0 && c.approvals.every((a) => a.decision === "approved");
  const approvedCount = c.approvals.filter((a) => a.decision === "approved").length;
  const openTasks = tasks.filter((t) => t.t.status !== "done").length;
  const stepIdx = Math.max(0, STEPS.indexOf(c.status === "open" ? "planning" : c.status === "rolled_back" ? "completed" : c.status));

  const next =
    c.status === "planning" ? (c.type === "standard" ? { label: "start the change", hint: "Standard changes are pre-approved." } : c.approvals.length ? { label: "submit for approval", hint: `${c.approvals.map((a) => a.name).join(", ")} will be notified.` } : { label: "add approvers", hint: "Normal and emergency changes need at least one approver." })
    : c.status === "awaiting_approval" ? (myTurn ? { label: "your approval", hint: "Read the plan and rollback below, then decide." } : { label: "wait for approval", hint: `${approvedCount} of ${c.approvals.length} approved · ${c.approvals.filter((a) => a.decision === "pending").map((a) => a.name.split(" ")[0]).join(", ")} still to decide.` })
    : c.status === "approved" ? { label: "start in the planned window", hint: openTasks ? `${openTasks} preparation task${openTasks > 1 ? "s" : ""} still open.` : c.plannedStart ? `Window opens ${relTime(c.plannedStart)}.` : "" }
    : c.status === "in_progress" ? { label: "complete or roll back", hint: "Both notify the requester and update the status page." }
    : c.status === "completed" ? { label: "close after the review", hint: "Confirm linked problems are resolved." }
    : null;

  return (
    <>
      <Topbar crumbs={[{ label: "Changes", href: "/changes" }, { label: `CHG-${c.id}` }]} />
      <div className="flex min-h-0 flex-1 flex-col">
        <RecordHeader
          eyebrow={
            <>
              <span className="font-mono">CHG-{c.id}</span> · <span className="capitalize">{c.type} change</span> · raised by {requester} {relTime(c.createdAt)}
              {release && <> · release <Link href={`/releases/${c.releaseId}`} className="text-accent-ink hover:underline">{release}</Link></>}
            </>
          }
          title={c.title}
          chips={
            <>
              <Tone tone={c.status === "awaiting_approval" ? "warn" : c.status === "in_progress" ? "violet" : c.status === "completed" ? "ok" : c.status === "rolled_back" ? "crit" : "neutral"}>{CHANGE_STATUS_LABEL[c.status]}</Tone>
              <Tone tone={(RISK_TONE[c.risk] ?? "neutral")} className="capitalize">{c.risk} risk</Tone>
              <Tone tone={(RISK_TONE[c.impact] ?? "neutral")} className="capitalize">{c.impact} impact</Tone>
              <PriorityMark priority={c.priority} withLabel className="rounded-md bg-surface-2 px-2 py-1" />
            </>
          }
          actions={
            <>
              {c.status === "planning" && c.approvals.length > 0 && c.type !== "standard" && (
                <form action={transitionChange.bind(null, c.id, "awaiting_approval")}><Button type="submit" size="sm" variant="primary">Submit for approval</Button></form>
              )}
              {c.status === "planning" && (c.type === "standard" || c.approvals.length === 0) && (
                <form action={transitionChange.bind(null, c.id, "approved")}><Button type="submit" size="sm" variant="primary">{c.type === "standard" ? "Approve (standard)" : "Approve without CAB"}</Button></form>
              )}
              {c.status === "awaiting_approval" && allApproved && <form action={transitionChange.bind(null, c.id, "approved")}><Button type="submit" size="sm" variant="primary">Mark approved</Button></form>}
              {c.status === "approved" && <form action={transitionChange.bind(null, c.id, "in_progress")}><Button type="submit" size="sm" variant="primary"><Play className="size-3.5" /> Start implementation</Button></form>}
              {c.status === "in_progress" && (
                <>
                  <form action={transitionChange.bind(null, c.id, "completed")}><Button type="submit" size="sm" variant="primary">Complete</Button></form>
                  <form action={transitionChange.bind(null, c.id, "rolled_back")}><Button type="submit" size="sm" variant="danger">Roll back</Button></form>
                </>
              )}
              {(c.status === "completed" || c.status === "rolled_back") && <form action={transitionChange.bind(null, c.id, "closed")}><Button type="submit" size="sm" variant="secondary">Close</Button></form>}
            </>
          }
        />
        <div className="grid min-h-0 flex-1 grid-cols-[minmax(0,1fr)_320px] overflow-y-auto">
          <div className="space-y-4 px-6 py-4">
            <ol className="grid grid-cols-6 gap-1.5">
              {STEPS.map((s, i) => (
                <li key={s}>
                  <div className={`h-1 rounded-full ${i <= stepIdx ? (c.status === "rolled_back" && i === stepIdx ? "bg-crit" : "bg-accent") : "bg-surface-3"}`} />
                  <p className={`mt-1 text-[11px] ${i <= stepIdx ? "text-ink" : "text-ink-3"}`}>{c.status === "rolled_back" && s === "completed" ? "Rolled back" : CHANGE_STATUS_LABEL[s]}</p>
                </li>
              ))}
            </ol>
            {next && (
              <NextStep label={next.label} hint={next.hint}>
                {myTurn && <ApprovalActions changeId={c.id} compact />}
                {c.status === "approved" && <form action={transitionChange.bind(null, c.id, "in_progress")}><Button type="submit" size="sm" variant="primary"><Play className="size-3.5" /> Start implementation</Button></form>}
              </NextStep>
            )}
            <div className="grid gap-4 md:grid-cols-2">
              <Block title="What and why">
                <p className="whitespace-pre-wrap text-[13.5px] leading-relaxed">{c.description || "—"}</p>
                {c.reason && <p className="mt-3 text-[12.5px] text-ink-2"><span className="text-ink-3">Reason: </span>{c.reason}</p>}
              </Block>
              <Block title="Window">
                <Prop label="Planned start">{c.plannedStart ? longTime(c.plannedStart) : "—"}</Prop>
                <Prop label="Planned end">{c.plannedEnd ? longTime(c.plannedEnd) : "—"}</Prop>
                <Prop label="Affected">{services.filter((s) => s.maintenanceFrom && c.plannedStart && Math.abs(s.maintenanceFrom.getTime() - c.plannedStart.getTime()) < 3600_000).map((s) => s.name).join(", ") || (assets.length ? `${assets.length} assets` : "—")}</Prop>
                {c.completedAt && <Prop label="Completed">{longTime(c.completedAt)}</Prop>}
              </Block>
              <Block title="Rollback plan">
                <p className="whitespace-pre-wrap text-[13px]">{c.rollbackPlan || <span className="text-ink-3">Not written — required before approval for normal and emergency changes.</span>}</p>
              </Block>
              <Block title="Test plan">
                <p className="whitespace-pre-wrap text-[13px]">{c.testPlan || <span className="text-ink-3">—</span>}</p>
              </Block>
            </div>
            <Block title="Tasks" action={<span className="text-[12px] text-ink-3">{openTasks} open</span>}>
              <RecordTasks rows={tasks} parentType="change" parentId={c.id} back={back} />
            </Block>
          </div>
          <aside className="min-w-0 space-y-4 bg-surface px-4 py-4 hairline-l">
            <div id="approvals">
              <div className="mb-2 flex items-baseline justify-between">
                <p className="label">Approvals</p>
                {c.approvals.length > 0 && <span className="tnum text-[11px] text-ink-3">{approvedCount} of {c.approvals.length} approved</span>}
              </div>
              {c.approvals.length === 0 ? (
                <p className="text-[12.5px] text-ink-3">{c.type === "standard" ? "Standard change — pre-approved by policy." : "No approvers set."}</p>
              ) : (
                <ul className="space-y-1.5">
                  {c.approvals.map((a) => (
                    <li key={a.personId} className="flex min-w-0 items-center gap-2 text-[13px]">
                      <Avatar name={a.name} size={20} />
                      <span className="min-w-0 flex-1 truncate">{a.name}{a.personId === me.id && <span className="text-ink-3"> (you)</span>}</span>
                      <Tone tone={a.decision === "approved" ? "ok" : a.decision === "rejected" ? "crit" : "warn"} className="capitalize">{a.decision === "rejected" ? "Changes requested" : a.decision}</Tone>
                    </li>
                  ))}
                </ul>
              )}
              {myTurn && <ApprovalActions changeId={c.id} />}
            </div>
            <div className="space-y-1.5 hairline-t pt-4">
              <Prop label="Assignee">{assignee ?? "—"}</Prop>
              <Prop label="Team">{group ?? "—"}</Prop>
              <Prop label="Requester">{requester}</Prop>
              <Prop label="Type"><span className="capitalize">{c.type}</span></Prop>
            </div>
            {problems.length > 0 && (
              <div className="hairline-t pt-4">
                <p className="label mb-2">Fixes problem</p>
                {problems.map((p) => (
                  <Link key={p.id} href={`/problems/${p.id}`} className="block rounded-md p-2.5 hairline hover:bg-surface-2">
                    <span className="block text-[13px] font-medium">{p.title}</span>
                    <span className="text-[12px] text-ink-3">PRB-{p.id} · {PROBLEM_STATUS_LABEL[p.status]}</span>
                  </Link>
                ))}
              </div>
            )}
            <div className="hairline-t pt-4">
              <p className="label mb-2">Activity</p>
              <ul className="space-y-1.5">
                {activity.length === 0 && <li className="text-[12px] text-ink-3">No changes recorded.</li>}
                {activity.slice(0, 8).map((a) => (
                  <li key={a.id} className="text-[12px] text-ink-3">
                    <span className="font-medium text-ink-2">{a.actorName}</span> <span className="font-mono text-[11px]">{a.action}</span> <span className="text-ink-3">· {relTime(a.ts)}</span>
                  </li>
                ))}
              </ul>
            </div>
          </aside>
        </div>
      </div>
    </>
  );
}
