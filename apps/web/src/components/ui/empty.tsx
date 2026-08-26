export function Empty({ title, hint, action }: { title: string; hint?: string; action?: React.ReactNode }) {
  return (
    <div className="flex flex-col items-center justify-center gap-2 px-6 py-16 text-center">
      <svg width="56" height="28" viewBox="0 0 56 28" aria-hidden className="mb-2 text-ink-4">
        <path d="M2 24 C 14 2, 28 26, 54 4" fill="none" stroke="currentColor" strokeWidth="1.5" strokeDasharray="3 4" strokeLinecap="round" />
        <circle cx="54" cy="4" r="2" fill="currentColor" />
      </svg>
      <p className="text-[14px] font-medium text-ink">{title}</p>
      {hint && <p className="max-w-sm text-[13px] text-ink-3">{hint}</p>}
      {action && <div className="mt-2">{action}</div>}
    </div>
  );
}
