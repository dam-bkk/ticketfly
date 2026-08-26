import { ModuleStub } from "@/components/ui/module-stub";
import { requireStaff } from "@/lib/auth";
export const metadata = { title: "Notifications" };
export default async function Page() {
  await requireStaff();
  return <ModuleStub title="Notifications" replaces="Freshservice notifications" phase="Phase 1.1" summary="One place for what needs you: assignments, mentions, SLA warnings, approvals." will={["In-app + email + Teams delivery","Per-event preferences","Mark all read"]} related={[]} />;
}
