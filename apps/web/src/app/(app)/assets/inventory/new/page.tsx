import { ModuleStub } from "@/components/ui/module-stub";
import { requireStaff } from "@/lib/auth";
export const metadata = { title: "Add asset" };
export default async function Page() {
  await requireStaff();
  return <ModuleStub title="Add asset" replaces="Freshservice Add New" phase="Phase 2" summary="Manual entry for what discovery cannot see: monitors, peripherals, spare stock. Everything else arrives from Intune and Defender automatically." will={["Asset type, tag (auto), serial, model, vendor","Assign to person or stock location","Purchase order and contract links"]} related={[{ href: "/assets/inventory", label: "Inventory" }]} />;
}
