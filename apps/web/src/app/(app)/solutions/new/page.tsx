import { ModuleStub } from "@/components/ui/module-stub";
import { requireStaff } from "@/lib/auth";
export const metadata = { title: "New article" };
export default async function Page() {
  await requireStaff();
  return <ModuleStub title="New article" replaces="Freshservice Add New" phase="Phase 1.1" summary="Markdown editor with folder, visibility and review date." will={["Draft → review → publish","Insert into ticket replies","Usage stats"]} related={[{ href: "/solutions", label: "Solutions" }]} />;
}
