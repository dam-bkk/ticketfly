import { ModuleStub } from "@/components/ui/module-stub";
import { requireStaff } from "@/lib/auth";
export const metadata = { title: "SLA performance" };
export default async function Page() {
  await requireStaff();
  return <ModuleStub title="SLA performance" replaces="Freshservice SLA reports" phase="Phase 1.1" summary="Attainment per priority and team over any window, with pause-time shown separately." will={["Met / breached / paused per priority","Business-hours vs calendar-hours policies","Breach reasons and repeat offenders","Export"]} related={[{ href: "/admin/sla", label: "SLA policies" }]} />;
}
