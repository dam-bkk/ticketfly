import { ModuleStub } from "@/components/ui/module-stub";
import { requireStaff } from "@/lib/auth";
export const metadata = { title: "Changes" };
export default async function Page() {
  await requireStaff();
  return <ModuleStub title="Changes" replaces="Freshservice Changes + CAB" phase="Phase 2" summary="Standard, normal and emergency changes with approvals and a calendar." will={["Change types, risk and impact matrix","CAB approvals with Teams notification","Change calendar and freeze windows","Linked problems, tickets, assets and releases"]} related={[{ href: "/tickets", label: "Tickets" }]} />;
}
