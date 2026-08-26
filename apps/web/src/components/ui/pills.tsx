import { cn, KIND_LABEL, PRIORITY_LABEL, STATUS_SHORT } from "@/lib/utils";
import type { SlaView } from "@/lib/sla";
import { ArrowDown, ArrowUp, ChevronsUp, Minus, Pause } from "lucide-react";

/** One hue per status — no two active statuses share a colour. */
const STATUS_DOT: Record<string, string> = {
  open: "bg-accent",
  in_progress: "bg-violet",
  pending: "bg-warn",
  pending_approval: "bg-info",
  on_hold: "bg-ink-2",
  transferred: "bg-ink-3",
  resolved: "bg-ok",
  cancelled: "bg-ink-4",
  closed: "bg-ink-4",
};

export function StatusDot({ status, className }: { status: string; className?: string }) {
  return <span aria-hidden className={cn("inline-block size-1.5 shrink-0 rounded-full", STATUS_DOT[status] ?? "bg-ink-4", className)} />;
}

export function StatusPill({ status, className }: { status: string; className?: string }) {
  return (
    <span className={cn("inline-flex h-6 items-center gap-1.5 rounded-md bg-surface-2 px-2 text-[12.5px] font-medium text-ink-2", className)}>
      <StatusDot status={status} />
      {STATUS_SHORT[status] ?? status}
    </span>
  );
}

/**
 * Priority glyph with an accessible name.
 * `withLabel`: `true` always shows the text label; `"wide"` shows it only at ≥1600px (list rows, once the filter pane leaves room).
 * The label is ink-2 for AA contrast; only the glyph carries the priority hue.
 */
export function PriorityMark({ priority, withLabel, className }: { priority: string; withLabel?: boolean | "wide"; className?: string }) {
  const map: Record<string, { icon: React.ReactNode; color: string }> = {
    urgent: { icon: <ChevronsUp className="size-3.5" strokeWidth={2.5} />, color: "text-crit" },
    high: { icon: <ArrowUp className="size-3.5" strokeWidth={2.5} />, color: "text-warn" },
    medium: { icon: <Minus className="size-3.5" strokeWidth={2.5} />, color: "text-ink-3" },
    low: { icon: <ArrowDown className="size-3.5" strokeWidth={2.5} />, color: "text-ink-3" },
  };
  const m = map[priority] ?? map.medium!;
  const label = PRIORITY_LABEL[priority] ?? priority;
  return (
    <span className={cn("inline-flex items-center gap-1", m.color, className)} title={`${label} priority`}>
      <span aria-hidden>{m.icon}</span>
      {withLabel ? <span aria-hidden className={cn("text-[12.5px] font-medium text-ink-2", withLabel === "wide" && "hidden min-[1600px]:inline")}>{label}</span> : null}
      <span className="sr-only">{label} priority</span>
    </span>
  );
}

export function SlaChip({ sla, compact, className }: { sla: SlaView; compact?: boolean; className?: string }) {
  const tone =
    sla.status === "breached" ? "text-crit bg-crit-soft" : sla.status === "at_risk" ? "text-warn bg-warn-soft" : sla.status === "met" ? "text-ok bg-ok-soft" : sla.status === "paused" ? "text-ink-3 bg-surface-2" : "text-ink-2 bg-surface-2";
  return (
    <span className={cn("tnum inline-flex h-6 items-center gap-1 whitespace-nowrap rounded-md px-2 text-[12.5px] font-medium", tone, className)}>
      {sla.status === "paused" && <Pause className="size-3" />}
      {compact && sla.status === "ok" ? sla.label.replace(" left", "") : sla.label}
    </span>
  );
}

export function KindTag({ kind }: { kind: string }) {
  return <span className="inline-flex h-5 items-center rounded px-1.5 text-[11px] font-medium text-ink-3 hairline">{KIND_LABEL[kind] ?? kind}</span>;
}

export function Tag({ children, className }: { children: React.ReactNode; className?: string }) {
  return <span className={cn("inline-flex h-5 shrink-0 items-center whitespace-nowrap rounded-md bg-surface-2 px-1.5 text-[11px] font-medium text-ink-2", className)}>{children}</span>;
}

export function Tone({ tone, children, className }: { tone: "ok" | "warn" | "crit" | "info" | "neutral" | "violet"; children: React.ReactNode; className?: string }) {
  const map = {
    ok: "text-ok bg-ok-soft",
    warn: "text-warn bg-warn-soft",
    crit: "text-crit bg-crit-soft",
    info: "text-info bg-info-soft",
    violet: "text-violet bg-violet-soft",
    neutral: "text-ink-2 bg-surface-2",
  };
  return <span className={cn("inline-flex h-6 items-center gap-1.5 rounded-md px-2 text-[12.5px] font-medium", map[tone], className)}>{children}</span>;
}
