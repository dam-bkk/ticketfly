import { ModuleStub } from "@/components/ui/module-stub";
import { requireStaff } from "@/lib/auth";
export const metadata = { title: "Status page" };
export default async function Page() {
  await requireStaff();
  return <ModuleStub title="Status page" replaces="Freshservice Status Pages" phase="Phase 3" summary="Planned maintenance and live incidents for staff, fed from tickets flagged as major." will={["Service catalogue with health","Maintenance windows published to the portal","Subscriber notifications"]} related={[{ href: "/admin/status", label: "System status (internal)" }]} />;
}
