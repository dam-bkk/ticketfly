import { ModuleStub } from "@/components/ui/module-stub";
import { requireStaff } from "@/lib/auth";
export const metadata = { title: "Projects" };
export default async function Page() {
  await requireStaff();
  return <ModuleStub title="Projects" replaces="Freshservice Projects / Smartsheet" phase="Phase 4" summary="Grid-first project tracking — the Smartsheet feel people ask for, on the same data as tickets." will={["Spreadsheet-style grid with formulas and dependencies","Tasks linked to tickets and changes","Gantt and board views","QVI migration path from Smartsheet"]} related={[{ href: "/tickets/board", label: "Ticket board (preview)" }]} />;
}
