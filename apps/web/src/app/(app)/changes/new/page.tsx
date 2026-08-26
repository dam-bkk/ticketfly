import { ModuleStub } from "@/components/ui/module-stub";
import { requireStaff } from "@/lib/auth";
export const metadata = { title: "New change" };
export default async function Page() {
  await requireStaff();
  return <ModuleStub title="New change" replaces="Freshservice New Change" phase="Phase 2" summary="Change request form with risk assessment." will={["Type, risk, impact","Planned window","Approvers"]} related={[{ href: "/changes", label: "Changes" }]} />;
}
