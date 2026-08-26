import { db, schema } from "@ticketfly/db";
import { inArray, sql } from "drizzle-orm";
import { APP_VERSION, requireStaff } from "@/lib/auth";
import { inboxCounts } from "@/lib/queries";
import { Sidebar } from "@/components/shell/sidebar";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const me = await requireStaff();
  const c = await inboxCounts(me.id);
  const [ob] = await db.select({ n: sql<number>`count(*)::int` }).from(schema.onboardings).where(inArray(schema.onboardings.stage, ["requested", "provisioning", "ready", "blocked"]));
  return (
    <div className="flex h-dvh overflow-hidden">
      <Sidebar me={me} counts={{ open: c.open, mine: c.mine, atRisk: c.atRisk, onboarding: ob?.n ?? 0 }} version={APP_VERSION} />
      <div className="flex min-w-0 flex-1 flex-col">{children}</div>
    </div>
  );
}
