import { cn } from "@/lib/utils";

/** Wordmark: a ticket stub with a flight-path notch. */
export function Logo({ className, size = 22, wordmark = true }: { className?: string; size?: number; wordmark?: boolean }) {
  return (
    <span className={cn("inline-flex items-center gap-2", className)}>
      <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden>
        <path d="M4 6.5A2.5 2.5 0 0 1 6.5 4h11A2.5 2.5 0 0 1 20 6.5v3a2.5 2.5 0 0 0 0 5v3a2.5 2.5 0 0 1-2.5 2.5h-11A2.5 2.5 0 0 1 4 17.5v-3a2.5 2.5 0 0 0 0-5z" fill="var(--accent)" />
        <path d="M7.5 14.5c2-4 4.5-4.5 9-6" stroke="var(--on-accent)" strokeWidth="1.6" strokeLinecap="round" strokeDasharray="2.2 2.2" fill="none" />
        <circle cx="16.5" cy="8.5" r="1.4" fill="var(--on-accent)" />
      </svg>
      {wordmark && <span className="text-[15px] font-semibold tracking-[-0.01em] text-ink">TicketFly</span>}
    </span>
  );
}
