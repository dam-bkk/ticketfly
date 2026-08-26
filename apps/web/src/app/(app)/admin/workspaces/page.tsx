import { db, schema } from "@ticketfly/db";
import { asc, eq, inArray, sql } from "drizzle-orm";
import { X } from "lucide-react";
import { addWorkspaceMember, removeWorkspaceMember } from "@/app/extra-actions";
import { requireStaff } from "@/lib/auth";
import { Avatar } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Select } from "@/components/ui/input";
import { Tone } from "@/components/ui/pills";

export const metadata = { title: "Manage Workspaces" };

export default async function WorkspacesPage() {
  await requireStaff();
  const ws = await db.select().from(schema.workspaces).orderBy(asc(schema.workspaces.id));
  const members = await db.select({ m: schema.workspaceMembers, name: schema.people.displayName, title: schema.people.jobTitle }).from(schema.workspaceMembers).leftJoin(schema.people, eq(schema.people.id, schema.workspaceMembers.personId));
  const staff = await db.select({ id: schema.people.id, displayName: schema.people.displayName }).from(schema.people).where(inArray(schema.people.role, ["agent", "admin", "hr", "manager"])).orderBy(asc(schema.people.displayName));
  const counts = (await db.execute(sql`select workspace, (select count(*)::int from tickets t where t.workspace = w.workspace) tickets, (select count(*)::int from assets a where a.workspace = w.workspace) assets from (select distinct slug workspace from workspaces) w`)) as unknown as { workspace: string; tickets: number; assets: number }[];
  return (
    <div className="max-w-3xl">
      <h1 className="text-[20px] font-semibold tracking-[-0.01em]">Manage Workspaces</h1>
      <p className="text-[13px] text-ink-3">Each workspace has its own tickets, assets, projects and custom fields. Agents only see the workspaces they belong to; admins see all. The switcher at the top of every page moves between them.</p>
      <div className="mt-5 space-y-4">
        {ws.map((w) => {
          const ms = members.filter((m) => m.m.workspace === w.slug);
          const c = counts.find((x) => x.workspace === w.slug);
          return (
            <section key={w.slug} className="panel p-4">
              <div className="flex items-center gap-2">
                <h2 className="text-[14px] font-semibold">{w.name}</h2>
                {w.primary && <Tone tone="warn">Primary</Tone>}
                <span className="ml-auto text-[12px] text-ink-3">{c?.tickets ?? 0} tickets · {c?.assets ?? 0} assets · {ms.length} members</span>
              </div>
              <ul className="mt-3 flex flex-wrap gap-1.5">
                {ms.map((m) => (
                  <li key={m.m.personId} className="flex items-center gap-1.5 rounded-full py-0.5 pl-0.5 pr-2 text-[12.5px] hairline">
                    <Avatar name={m.name ?? "?"} size={20} /> {m.name} <span className="text-ink-4">{m.m.role}</span>
                    <form action={removeWorkspaceMember.bind(null, w.slug, m.m.personId)}>
                      <button type="submit" aria-label="Remove" className="rounded-full p-0.5 text-ink-3 hover:bg-surface-2 hover:text-ink"><X className="size-3" /></button>
                    </form>
                  </li>
                ))}
                {ms.length === 0 && <li className="text-[12.5px] text-ink-3">No members — only admins can see this workspace.</li>}
              </ul>
              <form action={addWorkspaceMember.bind(null, w.slug)} className="mt-3 flex items-center gap-2">
                <Select name="personId" defaultValue="" className="h-8 w-64 text-[12.5px]">
                  <option value="">Add a member…</option>
                  {staff.filter((s) => !ms.some((m) => m.m.personId === s.id)).map((s) => <option key={s.id} value={s.id}>{s.displayName}</option>)}
                </Select>
                <Select name="role" defaultValue="agent" className="h-8 w-28 text-[12.5px]"><option value="agent">Agent</option><option value="admin">Admin</option></Select>
                <Button type="submit" size="sm" variant="secondary">Add</Button>
              </form>
            </section>
          );
        })}
      </div>
    </div>
  );
}
