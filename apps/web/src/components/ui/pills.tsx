import { cn, KIND_LABEL, PRIORITY_LABEL, STATUS_SHORT } from "@/lib/utils";
import type { SlaView } from "@/lib/sla";
import { ArrowDown, ArrowUp, ChevronsUp, Minus, Pause } from "lucide-react";

const STATUS_DOT: Record<string, string> = {
  open: "bg-accent",
  in_progress: "bg-violet",
  pending: "bg-warn",
  pending_approval: "bg-violet",
  cancelled: "bg-ink-4",
  transferred: "bg-info",
  on_hold: "bg-ink-4",
  resolved: "bg-ok",
  closed: "bg-ink-4",
};

export function StatusDot({ status, className }: { status: string; className?: string }) {
  return <span aria-hidden className={cn("inline-block size-1.5 shrink-0 rounded-full", STATUS_DOT[status] ?? "bg-ink-4", className)} />;
}

export function StatusPill({ status, className }: { status: string; className?: string }) {
  return (
    <span className={cn("inline-flex h-6 items-center gap-1.5 rounded-md bg-surface-2 px-2 text-[12px] font-medium text-ink-2", className)}>
      <StatusDot status={status} />
      {STATUS_SHORT[status] ?? status}
    </span>
  );
}

export function PriorityMark({ priority, withLabel, className }: { priority: string; withLabel?: boolean; className?: string }) {
  const map: Record<string, { icon: React.ReactNode; color: string }> = {
    urgent: { icon: <ChevronsUp className="size-3.5" strokeWidth={2.5} />, color: "text-crit" },
    high: { icon: <ArrowUp className="size-3.5" strokeWidth={2.5} />, color: "text-warn" },
    medium: { icon: <Minus className="size-3.5" strokeWidth={2.5} />, color: "text-ink-3" },
    low: { icon: <ArrowDown className="size-3.5" strokeWidth={2.5} />, color: "text-ink-4" },
  };
  const m = map[priority] ?? map.medium!;
  return (
    <span className={cn("inline-flex items-center gap-1", m.color, className)} title={`${PRIORITY_LABEL[priority]} priority`}>
      {m.icon}
      {withLabel && <span className="text-[12px] font-medium">{PRIORITY_LABEL[priority]}</span>}
    </span>
  );
}

export function SlaChip({ sla, compact }: { sla: SlaView; compact?: boolean }) {
  const tone =
    sla.status === "breached" ? "text-crit bg-crit-soft" : sla.status === "at_risk" ? "text-warn bg-warn-soft" : sla.status === "met" ? "text-ok bg-ok-soft" : sla.status === "paused" ? "text-ink-3 bg-surface-2" : "text-ink-2 bg-surface-2";
  return (
    <span className={cn("tnum inline-flex h-6 items-center gap-1 rounded-md px-2 text-[12px] font-medium", tone)}>
      {sla.status === "paused" && <Pause className="size-3" />}
      {compact && sla.status === "ok" ? sla.label.replace(" left", "") : sla.label}
    </span>
  );
}

export function KindTag({ kind }: { kind: string }) {
  return <span className="inline-flex h-5 items-center rounded px-1.5 text-[11px] font-medium text-ink-3 hairline">{KIND_LABEL[kind] ?? kind}</span>;
}

export function Tag({ children }: { children: React.ReactNode }) {
  return <span className="inline-flex h-5 items-center rounded-md bg-surface-2 px-1.5 text-[11px] font-medium text-ink-2">{children}</span>;
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
  return <span className={cn("inline-flex h-6 items-center gap-1.5 rounded-md px-2 text-[12px] font-medium", map[tone], className)}>{children}</span>;
}
