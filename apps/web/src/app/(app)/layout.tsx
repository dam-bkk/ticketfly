import { db, schema } from "@ticketfly/db";
import { inArray, sql } from "drizzle-orm";
import { APP_VERSION, requireStaff } from "@/lib/auth";
import { inboxCounts } from "@/lib/queries";
import { getPrefs } from "@/lib/modules";
import { workspaceContext } from "@/lib/workspace";
import { Sidebar } from "@/components/shell/sidebar";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const me = await requireStaff();
  const { current } = await workspaceContext(me);
  const c = await inboxCounts(me.id, current.slug);
  const [ob] = await db.select({ n: sql<number>`count(*)::int` }).from(schema.onboardings).where(inArray(schema.onboardings.stage, ["requested", "provisioning", "ready", "blocked"]));
  const [extra] = (await db.execute(sql`select
    (select count(*) from changes c, jsonb_array_elements(c.approvals) a where c.status = 'awaiting_approval' and (a->>'personId')::int = ${me.id} and a->>'decision' = 'pending')::int as approvals,
    (select count(*) from tasks t where t.assignee_id = ${me.id} and t.status <> 'done' and t.due_at::date <= now()::date)::int as tasks,
    (select count(*) from alerts where status = 'new')::int as alerts`)) as unknown as { approvals: number; tasks: number; alerts: number }[];
  const prefs = await getPrefs(me.id);
  return (
    <div className="flex h-dvh overflow-hidden">
      <Sidebar me={me} counts={{ open: c.open, mine: c.mine, atRisk: c.atRisk, onboarding: ob?.n ?? 0, approvals: extra?.approvals, tasks: extra?.tasks, alerts: extra?.alerts }} version={APP_VERSION} hidden={prefs.hiddenModules} />
      <div className="flex min-w-0 flex-1 flex-col">{children}</div>
    </div>
  );
}
