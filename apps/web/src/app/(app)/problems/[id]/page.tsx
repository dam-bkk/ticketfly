import Link from "next/link";
import { notFound } from "next/navigation";
import { linkIncident, raiseChangeFromProblem, updateProblem } from "@/app/module-actions";
import { requireStaff } from "@/lib/auth";
import { getProblem } from "@/lib/modules";
import { listAgents } from "@/lib/queries";
import { longTime, relTime } from "@/lib/utils";
import { Topbar } from "@/components/shell/topbar";
import { Avatar } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Select } from "@/components/ui/input";
import { PriorityMark, StatusDot, Tone } from "@/components/ui/pills";
import { Block, CHANGE_STATUS_LABEL, NextStep, PROBLEM_STATUS_LABEL, Prop, RecordHeader, RefLink, RISK_TONE } from "@/components/ui/record";
import { RecordTasks } from "@/app/(app)/tickets/[id]/tasks";

export default async function ProblemPage({ params }: { params: Promise<{ id: string }> }) {
  await requireStaff();
  const { id } = await params;
  const [data, agents] = await Promise.all([getProblem(Number(id)), listAgents()]);
  if (!data) notFound();
  const { p, assignee, group, category, incidents, tasks, change, candidates, activity } = data;
  const back = `/problems/${p.id}`;

  const next =
    p.status === "open" && !p.rootCause ? { label: "find the root cause", hint: "Record what is actually wrong; the workaround unblocks agents meanwhile." } : p.status === "open" ? { label: "publish as known error", hint: "Agents will see the workaround on every linked ticket." } : p.status === "known_error" && !p.changeId ? { label: "raise the change that fixes it", hint: "One click — the change is pre-filled from this record." } : p.status === "known_error" ? { label: "resolve once the change completes", hint: change ? `Change is ${CHANGE_STATUS_LABEL[change.status]}.` : "" } : p.status === "resolved" ? { label: "close after the linked incidents are confirmed fixed" } : null;

  return (
    <>
      <Topbar crumbs={[{ label: "Problems", href: "/problems" }, { label: `PRB-${p.id}` }]} />
      <div className="flex min-h-0 flex-1 flex-col">
        <RecordHeader
          eyebrow={
            <>
              <span className="font-mono">PRB-{p.id}</span> · {category ?? "Uncategorised"} · opened {longTime(p.createdAt)}
            </>
          }
          title={p.title}
          chips={
            <>
              <Tone tone={p.status === "known_error" ? "warn" : p.status === "open" ? "info" : "neutral"}>{PROBLEM_STATUS_LABEL[p.status]}</Tone>
              <Tone tone={(RISK_TONE[p.impact] ?? "neutral")} className="capitalize">{p.impact} impact</Tone>
              <PriorityMark priority={p.priority} withLabel className="rounded-md bg-surface-2 px-2 py-1" />
              <span className="text-[12.5px] text-ink-3">{incidents.length} linked incident{incidents.length === 1 ? "" : "s"}</span>
            </>
          }
          actions={
            <>
              {p.status === "open" && (
                <form action={updateProblem.bind(null, p.id)}>
                  <input type="hidden" name="status" value="known_error" />
                  <Button type="submit" size="sm" variant="secondary">Mark known error</Button>
                </form>
              )}
              {(p.status === "open" || p.status === "known_error") && !p.changeId && (
                <form action={raiseChangeFromProblem.bind(null, p.id)}>
                  <Button type="submit" size="sm" variant="secondary">Raise change</Button>
                </form>
              )}
              {(p.status === "open" || p.status === "known_error") && (
                <form action={updateProblem.bind(null, p.id)}>
                  <input type="hidden" name="status" value="resolved" />
                  <Button type="submit" size="sm" variant="primary">Resolve</Button>
                </form>
              )}
              {p.status === "resolved" && (
                <form action={updateProblem.bind(null, p.id)}>
                  <input type="hidden" name="status" value="closed" />
                  <Button type="submit" size="sm" variant="secondary">Close</Button>
                </form>
              )}
            </>
          }
        />
        <div className="grid min-h-0 flex-1 grid-cols-[minmax(0,1fr)_320px] overflow-y-auto">
          <div className="space-y-4 px-6 py-4">
            {next && (
              <NextStep label={next.label} hint={next.hint}>
                {p.status === "open" && p.rootCause && (
                  <form action={updateProblem.bind(null, p.id)}>
                    <input type="hidden" name="status" value="known_error" />
                    <Button type="submit" size="sm" variant="primary">Mark known error</Button>
                  </form>
                )}
                {p.status === "known_error" && !p.changeId && (
                  <form action={raiseChangeFromProblem.bind(null, p.id)}>
                    <Button type="submit" size="sm" variant="primary">Raise change</Button>
                  </form>
                )}
                {p.status === "resolved" && (
                  <form action={updateProblem.bind(null, p.id)}>
                    <input type="hidden" name="status" value="closed" />
                    <Button type="submit" size="sm" variant="primary">Close</Button>
                  </form>
                )}
              </NextStep>
            )}
            <Block title="Description">
              <p className="whitespace-pre-wrap text-[13.5px] leading-relaxed">{p.description || "—"}</p>
            </Block>
            {/* Analysis: the textarea IS the panel body (no nested panel), one footer under all three. */}
            <form action={updateProblem.bind(null, p.id)} className="panel overflow-hidden">
              <div className="grid md:grid-cols-3 md:divide-x md:divide-line max-md:divide-y max-md:divide-line">
                {(
                  [
                    ["workaround", "Workaround", "What agents can tell users right now", p.workaround],
                    ["rootCause", "Root cause", "What is actually wrong", p.rootCause],
                    ["permanentFix", "Permanent fix", "What the change will do", p.permanentFix],
                  ] as const
                ).map(([name, title, placeholder, value]) => (
                  <label key={name} className="block min-w-0">
                    <span className="flex h-10 items-center px-4 text-[13px] font-semibold hairline-b">{title}</span>
                    <textarea name={name} defaultValue={value ?? ""} placeholder={placeholder} className="block min-h-36 w-full resize-none bg-transparent px-4 py-3 text-[13.5px] leading-relaxed text-ink outline-none placeholder:text-ink-3 focus:bg-surface-2/40" />
                  </label>
                ))}
              </div>
              <div className="flex items-center justify-between px-4 py-2.5 hairline-t">
                <span className="text-[12px] text-ink-3">The workaround shows on every linked ticket; the permanent fix pre-fills the change.</span>
                <Button type="submit" size="sm" variant="secondary">Save analysis</Button>
              </div>
            </form>
            <Block title={`Linked incidents · ${incidents.length}`} action={<span className="text-[12px] text-ink-3">Every linked ticket shows the workaround to its agent</span>}>
              {incidents.length === 0 ? <p className="text-[13px] text-ink-3">No incidents linked yet.</p> : (
                <ul className="divide-y divide-line">
                  {incidents.map((t) => (
                    <li key={t.id} className="flex items-center gap-3 py-2 text-[13px]">
                      <StatusDot status={t.status} />
                      <span className="w-24 font-mono text-[11.5px] text-ink-3">{t.ref}</span>
                      <RefLink href={`/tickets/${t.id}`}>{t.subject}</RefLink>
                      <span className="ml-auto text-[12px] text-ink-3">{t.requester}</span>
                      <PriorityMark priority={t.priority} />
                      <span className="w-16 text-right text-[12px] text-ink-3">{relTime(t.createdAt)}</span>
                    </li>
                  ))}
                </ul>
              )}
              {candidates.length > 0 && (
                <div className="mt-4 rounded-md bg-surface-2 p-3">
                  <p className="mb-2 text-[12px] font-medium text-ink-2">Open tickets in the same category — link the ones that share this cause</p>
                  <ul className="space-y-1">
                    {candidates.map((t) => (
                      <li key={t.id} className="flex items-center gap-2 text-[12.5px]">
                        <StatusDot status={t.status} />
                        <span className="min-w-0 flex-1 truncate">{t.subject}</span>
                        <form action={linkIncident.bind(null, p.id, t.id)}>
                          <button type="submit" className="text-[12px] font-medium text-accent-ink hover:underline">Link</button>
                        </form>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </Block>
            <Block title="Tasks">
              <RecordTasks rows={tasks} parentType="problem" parentId={p.id} back={back} />
            </Block>
          </div>
          <aside className="min-w-0 space-y-4 bg-surface px-4 py-4 hairline-l">
            <form action={updateProblem.bind(null, p.id)} className="space-y-2">
              <p className="label">Properties</p>
              <Prop label="Assignee">
                <Select name="assigneeId" defaultValue={p.assigneeId ?? ""} className="h-8 text-[12.5px]">
                  <option value="">Unassigned</option>
                  {agents.map((a) => (
                    <option key={a.id} value={a.id}>{a.displayName}</option>
                  ))}
                </Select>
              </Prop>
              <Prop label="Priority">
                <Select name="priority" defaultValue={p.priority} className="h-8 text-[12.5px]">
                  {["low", "medium", "high", "urgent"].map((v) => <option key={v} value={v}>{v[0]!.toUpperCase() + v.slice(1)}</option>)}
                </Select>
              </Prop>
              <Prop label="Impact">
                <Select name="impact" defaultValue={p.impact} className="h-8 text-[12.5px]">
                  {["low", "medium", "high"].map((v) => <option key={v} value={v}>{v[0]!.toUpperCase() + v.slice(1)}</option>)}
                </Select>
              </Prop>
              <Prop label="Team">{group ?? "—"}</Prop>
              <Prop label="Category">{category ?? "—"}</Prop>
              <div className="flex justify-end pt-1">
                <Button type="submit" size="sm" variant="secondary">Update</Button>
              </div>
            </form>
            <div className="hairline-t pt-4">
              <p className="label mb-2">Change</p>
              {change ? (
                <Link href={`/changes/${change.id}`} className="block rounded-md p-2.5 hairline hover:bg-surface-2">
                  <span className="block text-[13px] font-medium">{change.title}</span>
                  <span className="text-[12px] text-ink-3">CHG-{change.id} · {CHANGE_STATUS_LABEL[change.status]}</span>
                </Link>
              ) : (
                <p className="text-[12.5px] text-ink-3">No change yet. "Raise change" pre-fills one from the permanent fix.</p>
              )}
            </div>
            <div className="hairline-t pt-4">
              <p className="label mb-2">Activity</p>
              <ul className="space-y-1.5">
                {activity.length === 0 && <li className="text-[12px] text-ink-3">No changes recorded.</li>}
                {activity.slice(0, 8).map((a) => (
                  <li key={a.id} className="flex items-center gap-2 text-[12px] text-ink-3">
                    <Avatar name={a.actorName} size={16} />
                    <span className="font-medium text-ink-2">{a.actorName}</span> <span className="font-mono text-[11px]">{a.action}</span> <span className="text-ink-3">· {relTime(a.ts)}</span>
                  </li>
                ))}
              </ul>
            </div>
            {assignee && <p className="text-[11px] text-ink-3">Owned by {assignee}</p>}
          </aside>
        </div>
      </div>
    </>
  );
}
