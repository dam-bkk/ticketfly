import { ModuleStub } from "@/components/ui/module-stub";
import { requireStaff } from "@/lib/auth";
export const metadata = { title: "Customize sidebar" };
export default async function Page() {
  await requireStaff();
  return <ModuleStub title="Customize sidebar" replaces="Freshservice Customize Sidebar" phase="Phase 1.1" summary="Hide modules a workspace does not use; order the rest." will={["Per-role defaults","Per-user overrides"]} related={[]} />;
}
