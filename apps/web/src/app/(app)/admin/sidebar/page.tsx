import { saveSidebarPrefs } from "@/app/module-actions";
import { requireStaff } from "@/lib/auth";
import { getPrefs } from "@/lib/modules";
import { Button } from "@/components/ui/button";

export const metadata = { title: "Customize sidebar" };

export const MODULES: [string, string, string][] = [
  ["reporting", "Reporting", "Analytics and SLA performance"],
  ["dashboard", "Dashboard", "Service overview"],
  ["tickets", "Tickets", "List and board — cannot be hidden"],
  ["journeys", "Journeys", "Onboarding and offboarding"],
  ["problems", "Problems", "Known errors and root causes"],
  ["changes", "Changes", "Approvals and calendar"],
  ["releases", "Releases", "Changes that ship together"],
  ["tasks", "Tasks", "Your to-dos across records"],
  ["it-ops", "IT Operations", "Alerts and status page"],
  ["assets", "Assets", "Inventory, software, contracts, purchase orders"],
  ["projects", "Projects", "Grid-first project tracking"],
  ["people", "People", "Person records, devices, access"],
  ["solutions", "Solutions", "Knowledge base"],
  ["admin", "Admin", "Cannot be hidden"],
];

export default async function SidebarPrefs() {
  const me = await requireStaff();
  const prefs = await getPrefs(me.id);
  return (
    <div className="max-w-2xl">
      <h1 className="text-[20px] font-semibold tracking-[-0.01em]">Customize sidebar</h1>
      <p className="text-[13px] text-ink-3">Hide the modules you never open. Only your sidebar changes; everything stays reachable from search.</p>
      <form action={saveSidebarPrefs} className="panel mt-5 divide-y divide-line overflow-hidden">
        {MODULES.map(([key, label, desc]) => {
          const locked = key === "tickets" || key === "admin";
          return (
            <label key={key} className="flex cursor-pointer items-center gap-3 px-4 py-2.5 hover:bg-surface-2">
              <input type="checkbox" name="hidden" value={key} defaultChecked={prefs.hiddenModules.includes(key)} disabled={locked} className="size-3.5 accent-[var(--accent)]" />
              <span className="min-w-0 flex-1">
                <span className="block text-[13px] font-medium">{label}</span>
                <span className="block text-[12px] text-ink-3">{desc}</span>
              </span>
              <span className="text-[11.5px] text-ink-3">{locked ? "always shown" : "tick to hide"}</span>
            </label>
          );
        })}
        <div className="flex justify-end px-4 py-3">
          <Button type="submit" variant="primary">Save</Button>
        </div>
      </form>
    </div>
  );
}
