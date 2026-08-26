import { cn } from "@/lib/utils";

/** QI Service Desk mark — same name as the tool it replaces, so nobody has to learn a new one. */
export function Logo({ className, size = 22, wordmark = true }: { className?: string; size?: number; wordmark?: boolean }) {
  return (
    <span className={cn("inline-flex items-center gap-2", className)}>
      <span className="relative inline-flex items-center font-semibold tracking-[-0.04em] text-ink" style={{ fontSize: size * 0.95, lineHeight: 1 }} aria-label="QI">
        Q<span className="text-ink-2">i</span>
        <span className="absolute -right-1.5 top-0 size-1.5 rounded-full bg-crit" />
      </span>
      {wordmark && <span className="ml-1 text-[14px] font-medium tracking-[-0.01em] text-ink">Service Desk</span>}
    </span>
  );
}
