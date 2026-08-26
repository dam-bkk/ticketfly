import { ModuleStub } from "@/components/ui/module-stub";
import { requireStaff } from "@/lib/auth";
export const metadata = { title: "Problems" };
export default async function Page() {
  await requireStaff();
  return <ModuleStub title="Problems" replaces="Freshservice Problems" phase="Phase 2" summary="Known errors and root causes, linked to the incidents they explain." will={["Problem records with impact, root cause, workaround","Link incidents; auto-suggest when 3+ similar tickets land in a week","Known error database surfaced in the agent composer","Close-out to a Change"]} related={[{ href: "/tickets", label: "Tickets" }]} />;
}
