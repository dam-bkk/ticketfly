import { cn } from "@/lib/utils";

/** QI mark — navy Q, red i — drawn as paths so it stays crisp at any size. Same name as the tool it replaces. */
export function QiMark({ size = 22, className }: { size?: number; className?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 64 64" aria-hidden className={cn("shrink-0", className)}>
      {/* Q */}
      <path d="M26 10c-11.6 0-21 9.4-21 21s9.4 21 21 21c3.6 0 7-.9 9.9-2.5l4.6 4.5 5.6-5.6-4.4-4.3A20.9 20.9 0 0 0 47 31c0-11.6-9.4-21-21-21zm0 8.4c7 0 12.6 5.6 12.6 12.6S33 43.6 26 43.6 13.4 38 13.4 31 19 18.4 26 18.4z" fill="#1E2B5C" />
      {/* i */}
      <rect x="50" y="23" width="9" height="29" rx="1.5" fill="#E2312B" />
      <circle cx="54.5" cy="14.5" r="5" fill="#E2312B" />
    </svg>
  );
}

export function Logo({ className, size = 22, wordmark = true }: { className?: string; size?: number; wordmark?: boolean }) {
  return (
    <span className={cn("inline-flex items-center gap-2", className)}>
      <QiMark size={size} />
      {wordmark && <span className="text-[14px] font-medium tracking-[-0.01em] text-ink">Service Desk</span>}
    </span>
  );
}
