import type { SlaView } from "@/lib/sla";
import { longTime } from "@/lib/utils";

export function SlaBlock({ first, resolution, status }: { first: SlaView; resolution: SlaView; status: string }) {
  const done = status === "closed";
  return (
    <section className="px-5 py-4 hairline-t">
      <p className="label mb-3">Service level</p>
      <Clock label="First response" sla={first} />
      <Clock label="Resolution" sla={resolution} muted={done && resolution.status === "n/a"} />
    </section>
  );
}

function Clock({ label, sla, muted }: { label: string; sla: SlaView; muted?: boolean }) {
  const color = sla.status === "breached" ? "var(--crit)" : sla.status === "at_risk" ? "var(--warn)" : sla.status === "met" ? "var(--ok)" : sla.status === "paused" ? "var(--ink-4)" : "var(--accent)";
  const tone = sla.status === "breached" ? "text-crit" : sla.status === "at_risk" ? "text-warn" : sla.status === "met" ? "text-ok" : "text-ink-2";
  return (
    <div className="mb-3 last:mb-0">
      <div className="flex items-baseline justify-between text-[12.5px]">
        <span className="text-ink-2">{label}</span>
        <span className={`tnum font-medium ${muted ? "text-ink-3" : tone}`}>{muted ? "—" : sla.label}</span>
      </div>
      <div className="bar mt-1.5">
        <i style={{ width: `${Math.round(sla.consumed * 100)}%`, background: color }} />
      </div>
      <p className="mt-1 text-[11px] text-ink-3">{sla.status === "met" ? "Met" : "Due"} {longTime(sla.dueAt)}</p>
    </div>
  );
}
