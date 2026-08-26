import { ModuleStub } from "@/components/ui/module-stub";
import { requireStaff } from "@/lib/auth";
export const metadata = { title: "Tasks" };
export default async function Page() {
  await requireStaff();
  return <ModuleStub title="Tasks" replaces="Freshservice Tasks" phase="Phase 1.1" summary="Sub-tasks on tickets, changes and journeys, assignable across teams with their own due dates." will={["Tasks on any record with owner and due","My tasks view across modules","Checklist templates (from Admin)"]} related={[{ href: "/journeys/onboarding", label: "Journeys use tasks today" }]} />;
}
