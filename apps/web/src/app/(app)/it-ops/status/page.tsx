import { format } from "date-fns";
import { setServiceHealth } from "@/app/module-actions";
import { requireStaff } from "@/lib/auth";
import { listServices } from "@/lib/modules";
import { cn } from "@/lib/utils";
import { Topbar } from "@/components/shell/topbar";
import { Avatar } from "@/components/ui/avatar";

export const metadata = { title: "Status page" };

const HEALTH: Record<string, { label: string; dot: string; tone: string }> = {
  operational: { label: "Operational", dot: "bg-ok", tone: "text-ok" },
  degraded: { label: "Degraded", dot: "bg-warn", tone: "text-warn" },
  outage: { label: "Outage", dot: "bg-crit", tone: "text-crit" },
  maintenance: { label: "Maintenance", dot: "bg-info", tone: "text-info" },
};

export default async function StatusPage() {
  await requireStaff();
  const rows = await listServices();
  const overall = rows.some((r) => r.s.health === "outage") ? "outage" : rows.some((r) => r.s.health === "degraded") ? "degraded" : "operational";
  const upcoming = rows.filter((r) => r.s.maintenanceFrom && r.s.maintenanceFrom > new Date());
  return (
    <>
      <Topbar crumbs={[{ label: "IT Operations" }, { label: "Status page" }]} />
      <div className="flex-1 overflow-y-auto">
        <div className="mx-auto max-w-[900px] px-6 py-6 rise">
          <div className="flex items-end justify-between">
            <div>
              <h1 className="text-[20px] font-semibold tracking-[-0.01em]">Service status</h1>
              <p className="text-[13px] text-ink-3">What staff see on the portal. Change owners flip a service here; starting a change with a window does it automatically.</p>
            </div>
            <span className={cn("flex shrink-0 items-center gap-2 whitespace-nowrap rounded-md px-3 py-1.5 text-[12.5px] font-medium hairline", HEALTH[overall]!.tone)}>
              <span className={cn("size-2 rounded-full", HEALTH[overall]!.dot)} /> {overall === "operational" ? "All systems operational" : overall === "degraded" ? "Some services degraded" : "Outage in progress"}
            </span>
          </div>
          {upcoming.length > 0 && (
            <div className="mt-5 rounded-lg bg-info-soft px-4 py-3 text-[13px] text-info">
              <strong className="font-medium">Planned maintenance:</strong>{" "}
              {upcoming.map((r) => `${r.s.name} — ${format(r.s.maintenanceFrom!, "EEE d MMM HH:mm")}–${format(r.s.maintenanceTo!, "HH:mm")}${r.s.maintenanceNote ? ` (${r.s.maintenanceNote})` : ""}`).join("; ")}
            </div>
          )}
          <ul className="panel mt-5 divide-y divide-line overflow-hidden">
            {rows.map(({ s, owner }) => (
              <li key={s.id} className="flex items-center gap-4 px-4 py-3">
                <span className={cn("size-2.5 rounded-full", HEALTH[s.health]?.dot ?? "bg-ink-4")} />
                <span className="min-w-0 flex-1">
                  <span className="block text-[13.5px] font-medium">{s.name}</span>
                  {s.maintenanceFrom && <span className="text-[12px] text-ink-3">Maintenance {format(s.maintenanceFrom, "d MMM HH:mm")} → {s.maintenanceTo ? format(s.maintenanceTo, "HH:mm") : ""}</span>}
                </span>
                {owner && <span className="flex items-center gap-1.5 text-[12px] text-ink-3"><Avatar name={owner} size={16} /> {owner}</span>}
                <span className="flex shrink-0 gap-0.5 rounded-md bg-surface-2 p-0.5" role="group" aria-label={`Status of ${s.name}`}>
                  {Object.entries(HEALTH).map(([key, h]) => (
                    <form key={key} action={setServiceHealth.bind(null, s.id, key)}>
                      <button type="submit" aria-pressed={s.health === key} className={cn("h-6 rounded-[5px] px-2 text-[11px] font-medium transition-colors", s.health === key ? `bg-surface shadow-1 ${h.tone}` : "text-ink-3 hover:text-ink")}>{h.label}</button>
                    </form>
                  ))}
                </span>
              </li>
            ))}
          </ul>
          <p className="mt-3 text-[12.5px] text-ink-3">Staff see the current status on the portal home under "Good to know".</p>
        </div>
      </div>
    </>
  );
}
