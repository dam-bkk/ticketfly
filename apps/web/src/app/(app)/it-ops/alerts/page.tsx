import { ModuleStub } from "@/components/ui/module-stub";
import { requireStaff } from "@/lib/auth";
export const metadata = { title: "Alerts" };
export default async function Page() {
  await requireStaff();
  return <ModuleStub title="Alerts" replaces="Freshservice Alert Management" phase="Phase 3" summary="Signals from Defender, Intune and Azure Monitor become alerts; alerts become incidents by rule." will={["Alert rules and de-duplication","On-call schedules and escalation","Auto-create major incident","Post-incident report templates"]} related={[{ href: "/admin/integrations", label: "Integrations" }]} />;
}
