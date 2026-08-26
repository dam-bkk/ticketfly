import { createChange } from "@/app/module-actions";
import { requireStaff } from "@/lib/auth";
import { listReleasesIt } from "@/lib/modules";
import { listAgents, listGroups } from "@/lib/queries";
import { Topbar } from "@/components/shell/topbar";
import { Button } from "@/components/ui/button";
import { Field, Input, Select, Textarea } from "@/components/ui/input";

export const metadata = { title: "New change" };

export default async function NewChange() {
  const me = await requireStaff();
  const [agents, groups, releases] = await Promise.all([listAgents(), listGroups(), listReleasesIt()]);
  const approvers = agents.filter((a) => ["Nada Haddad", "Ked Mardemootoo"].includes(a.displayName));
  return (
    <>
      <Topbar crumbs={[{ label: "Changes", href: "/changes" }, { label: "New" }]} />
      <div className="flex-1 overflow-y-auto">
        <form action={createChange} className="mx-auto max-w-3xl px-6 py-6 rise">
          <h1 className="text-[20px] font-semibold tracking-[-0.01em]">New change</h1>
          <p className="text-[13px] text-ink-3">One form. Standard changes are pre-approved; normal and emergency changes go to the approvers you pick and they get a notification with a two-click decision.</p>
          <div className="panel mt-5 space-y-4 p-5">
            <div className="grid gap-4 sm:grid-cols-3">
              {(["standard", "normal", "emergency"] as const).map((t) => (
                <label key={t} className="flex cursor-pointer flex-col gap-1 rounded-lg p-3 hairline has-[:checked]:bg-accent-soft has-[:checked]:shadow-[inset_0_0_0_1px_var(--accent)]">
                  <span className="flex items-center gap-2 text-[13px] font-medium capitalize">
                    <input type="radio" name="type" value={t} defaultChecked={t === "normal"} className="accent-[var(--accent)]" /> {t}
                  </span>
                  <span className="text-[12px] text-ink-3">{t === "standard" ? "Repeatable, low risk, pre-approved (patching, standard installs)." : t === "normal" ? "Needs approval and a planned window." : "Approve fast, review after. For live incidents."}</span>
                </label>
              ))}
            </div>
            <Field label="Title" required>
              <Input name="title" required placeholder="What will change" />
            </Field>
            <Field label="Description" required>
              <Textarea name="description" required placeholder="Scope, steps, who does what" />
            </Field>
            <Field label="Reason">
              <Input name="reason" placeholder="Why now — problem it fixes, request it fulfils" />
            </Field>
            <div className="grid gap-4 sm:grid-cols-3">
              <Field label="Risk">
                <Select name="risk" defaultValue="medium">{["low", "medium", "high"].map((v) => <option key={v} value={v}>{v[0]!.toUpperCase() + v.slice(1)}</option>)}</Select>
              </Field>
              <Field label="Impact">
                <Select name="impact" defaultValue="medium">{["low", "medium", "high"].map((v) => <option key={v} value={v}>{v[0]!.toUpperCase() + v.slice(1)}</option>)}</Select>
              </Field>
              <Field label="Priority">
                <Select name="priority" defaultValue="medium">{["low", "medium", "high", "urgent"].map((v) => <option key={v} value={v}>{v[0]!.toUpperCase() + v.slice(1)}</option>)}</Select>
              </Field>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Planned start">
                <Input type="datetime-local" name="plannedStart" />
              </Field>
              <Field label="Planned end">
                <Input type="datetime-local" name="plannedEnd" />
              </Field>
            </div>
            <div className="grid gap-4 sm:grid-cols-3">
              <Field label="Assignee">
                <Select name="assigneeId" defaultValue={me.id}>{agents.map((a) => <option key={a.id} value={a.id}>{a.displayName}</option>)}</Select>
              </Field>
              <Field label="Team">
                <Select name="groupId" defaultValue="">
                  <option value="">—</option>
                  {groups.map((g) => <option key={g.id} value={g.id}>{g.name}</option>)}
                </Select>
              </Field>
              <Field label="Release">
                <Select name="releaseId" defaultValue="">
                  <option value="">None</option>
                  {releases.map((r) => <option key={r.r.id} value={r.r.id}>{r.r.name}</option>)}
                </Select>
              </Field>
            </div>
            <Field label="Rollback plan" help="Required for normal and emergency changes before approval.">
              <Textarea name="rollbackPlan" className="min-h-20" />
            </Field>
            <Field label="Test plan">
              <Textarea name="testPlan" className="min-h-20" />
            </Field>
            <Field label="Approvers" help="Ignored for standard changes.">
              <div className="flex flex-wrap gap-2">
                {approvers.map((a) => (
                  <label key={a.id} className="flex cursor-pointer items-center gap-2 rounded-md px-3 py-1.5 text-[13px] hairline has-[:checked]:bg-accent-soft">
                    <input type="checkbox" name="approverIds" value={a.id} defaultChecked className="accent-[var(--accent)]" /> {a.displayName}
                  </label>
                ))}
              </div>
            </Field>
          </div>
          <div className="mt-5 flex justify-end">
            <Button type="submit" variant="primary" size="lg">Create change</Button>
          </div>
        </form>
      </div>
    </>
  );
}
