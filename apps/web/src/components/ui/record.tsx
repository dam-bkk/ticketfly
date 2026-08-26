import Link from "next/link";
import { cn } from "@/lib/utils";

/**
 * Shared anatomy for ITIL records (problem / change / release): a header with the reference,
 * a "next step" action bar, a two-column body. Same shape everywhere so the journey is learned once.
 */
export function RecordHeader({ eyebrow, title, chips, actions }: { eyebrow: React.ReactNode; title: string; chips?: React.ReactNode; actions?: React.ReactNode }) {
  return (
    <div className="shrink-0 px-6 pt-5 pb-4 hairline-b">
      <div className="flex items-center gap-2 text-[12px] text-ink-3">{eyebrow}</div>
      <h1 className="mt-1 text-[20px] font-semibold leading-snug tracking-[-0.01em]" style={{ textWrap: "balance" }}>
        {title}
      </h1>
      {(chips || actions) && (
        <div className="mt-3 flex flex-wrap items-center gap-2">
          {chips}
          {actions && <div className="ml-auto flex flex-wrap items-center gap-1.5">{actions}</div>}
        </div>
      )}
    </div>
  );
}

export function NextStep({ label, hint, children }: { label: string; hint?: string; children?: React.ReactNode }) {
  return (
    <div className="flex items-center gap-3 rounded-lg bg-accent-soft/60 px-4 py-2.5">
      <span className="text-[13px]">
        <span className="font-medium text-ink">Next: {label}</span>
        {hint && <span className="ml-2 text-ink-2">{hint}</span>}
      </span>
      <span className="ml-auto flex items-center gap-1.5">{children}</span>
    </div>
  );
}

export function Prop({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="grid grid-cols-[110px_1fr] items-baseline gap-2 text-[13px]">
      <span className="text-ink-3">{label}</span>
      <span className="min-w-0 font-medium">{children}</span>
    </div>
  );
}

export function Block({ title, children, className, action }: { title: string; children: React.ReactNode; className?: string; action?: React.ReactNode }) {
  return (
    <section className={cn("panel overflow-hidden", className)}>
      <div className="flex items-center justify-between px-4 py-2.5 hairline-b">
        <h2 className="text-[13px] font-semibold">{title}</h2>
        {action}
      </div>
      <div className="p-4">{children}</div>
    </section>
  );
}

export function RefLink({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <Link href={href} className="font-medium text-accent-ink hover:underline">
      {children}
    </Link>
  );
}

export const CHANGE_STATUS_LABEL: Record<string, string> = { open: "Open", planning: "Planning", awaiting_approval: "Awaiting approval", approved: "Approved", in_progress: "In progress", completed: "Completed", rolled_back: "Rolled back", closed: "Closed" };
export const PROBLEM_STATUS_LABEL: Record<string, string> = { open: "Open", known_error: "Known error", resolved: "Resolved", closed: "Closed" };
export const RISK_TONE: Record<string, "ok" | "warn" | "crit"> = { low: "ok", medium: "warn", high: "crit" };
