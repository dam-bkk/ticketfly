import { ModuleStub } from "@/components/ui/module-stub";
import { requireStaff } from "@/lib/auth";
export const metadata = { title: "Reporting" };
export default async function Page() {
  await requireStaff();
  return <ModuleStub title="Reporting" replaces="Freshservice Analytics" phase="Phase 1.1" summary="Every question is a query on our own Postgres — no report builder tiers, no export caps." will={["Ticket volume, ageing and backlog by team, category and channel","SLA attainment by priority, with breach reasons","Agent workload and first-reply medians","Asset compliance, off-site devices, licence over-use","Saved reports, scheduled email delivery, CSV export"]} related={[{ href: "/dashboard", label: "Dashboard (live)" }, { href: "/reporting/sla", label: "SLA performance" }]} />;
}
