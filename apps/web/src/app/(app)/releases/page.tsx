import { ModuleStub } from "@/components/ui/module-stub";
import { requireStaff } from "@/lib/auth";
export const metadata = { title: "Releases" };
export default async function Page() {
  await requireStaff();
  return <ModuleStub title="Releases" replaces="Freshservice Releases" phase="Phase 2" summary="Group changes into a release with a plan, a window and a rollback." will={["Release plan, build and test tasks","Deployment window on the change calendar","Post-implementation review"]} related={[{ href: "/changes", label: "Changes" }]} />;
}
