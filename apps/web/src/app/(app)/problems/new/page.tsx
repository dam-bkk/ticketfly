import { db, schema } from "@ticketfly/db";
import { desc, inArray, isNull, and } from "drizzle-orm";
import { createProblem } from "@/app/module-actions";
import { requireStaff } from "@/lib/auth";
import { listAgents, listCategories, listGroups } from "@/lib/queries";
import { Topbar } from "@/components/shell/topbar";
import { Button } from "@/components/ui/button";
import { Field, Input, Select, Textarea } from "@/components/ui/input";
import { StatusDot } from "@/components/ui/pills";

export const metadata = { title: "New problem" };

export default async function NewProblem({ searchParams }: { searchParams: Promise<{ ticket?: string }> }) {
  const me = await requireStaff();
  const { ticket } = await searchParams;
  const [agents, groups, categories] = await Promise.all([listAgents(), listGroups(), listCategories()]);
  const candidates = await db.select({ id: schema.tickets.id, subject: schema.tickets.subject, status: schema.tickets.status, categoryId: schema.tickets.categoryId }).from(schema.tickets).where(and(inArray(schema.tickets.status, ["open", "in_progress", "pending"]), isNull(schema.tickets.problemId))).orderBy(desc(schema.tickets.createdAt)).limit(30);
  const seed = ticket ? candidates.find((c) => c.id === Number(ticket)) : null;
  return (
    <>
      <Topbar crumbs={[{ label: "Problems", href: "/problems" }, { label: "New" }]} />
      <div className="flex-1 overflow-y-auto">
        <form action={createProblem} className="mx-auto max-w-3xl px-6 py-6 rise">
          <h1 className="text-[20px] font-semibold tracking-[-0.01em]">New problem</h1>
          <p className="text-[13px] text-ink-3">One record for a cause shared by several incidents. Link the tickets now; their agents see the workaround immediately.</p>
          <div className="panel mt-5 space-y-4 p-5">
            <Field label="Title" required>
              <Input name="title" required defaultValue={seed ? seed.subject : ""} placeholder="What is failing, for whom, since when" />
            </Field>
            <Field label="Description">
              <Textarea name="description" placeholder="Symptoms, scope, what has been tried" />
            </Field>
            <Field label="Workaround (if known)" help="Shown to agents on every linked ticket.">
              <Textarea name="workaround" className="min-h-20" />
            </Field>
            <div className="grid gap-4 sm:grid-cols-4">
              <Field label="Priority">
                <Select name="priority" defaultValue="medium">{["low", "medium", "high", "urgent"].map((v) => <option key={v} value={v}>{v[0]!.toUpperCase() + v.slice(1)}</option>)}</Select>
              </Field>
              <Field label="Impact">
                <Select name="impact" defaultValue="medium">{["low", "medium", "high"].map((v) => <option key={v} value={v}>{v[0]!.toUpperCase() + v.slice(1)}</option>)}</Select>
              </Field>
              <Field label="Team">
                <Select name="groupId" defaultValue="">
                  <option value="">—</option>
                  {groups.map((g) => <option key={g.id} value={g.id}>{g.name}</option>)}
                </Select>
              </Field>
              <Field label="Category">
                <Select name="categoryId" defaultValue={seed?.categoryId ?? ""}>
                  <option value="">—</option>
                  {categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
                </Select>
              </Field>
            </div>
            <Field label="Assignee">
              <Select name="assigneeId" defaultValue={me.id}>
                {agents.map((a) => <option key={a.id} value={a.id}>{a.displayName}</option>)}
              </Select>
            </Field>
          </div>
          <div className="panel mt-4 p-5">
            <p className="text-[13px] font-medium">Link incidents</p>
            <p className="mb-3 text-[12.5px] text-ink-3">Open tickets not yet linked to a problem. Tick the ones that share this cause.</p>
            <ul className="max-h-72 space-y-1 overflow-y-auto">
              {candidates.map((c) => (
                <li key={c.id}>
                  <label className="flex cursor-pointer items-center gap-2.5 rounded-md px-2 py-1.5 text-[13px] hover:bg-surface-2">
                    <input type="checkbox" name="ticketIds" value={c.id} defaultChecked={seed?.id === c.id} className="size-3.5 accent-[var(--accent)]" />
                    <StatusDot status={c.status} />
                    <span className="truncate">{c.subject}</span>
                  </label>
                </li>
              ))}
            </ul>
          </div>
          <div className="mt-5 flex justify-end">
            <Button type="submit" variant="primary" size="lg">Create problem</Button>
          </div>
        </form>
      </div>
    </>
  );
}
