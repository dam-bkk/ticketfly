"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { cn } from "@/lib/utils";

/**
 * One save indicator for the whole properties rail. Properties and CustomFields both autosave;
 * each calls markSaved() when its server action resolves, and the single line under the heading updates.
 */
const Ctx = createContext<{ savedAt: Date | null; markSaved: () => void }>({ savedAt: null, markSaved: () => {} });

export function SavedAtProvider({ children }: { children: React.ReactNode }) {
  const [savedAt, setSavedAt] = useState<Date | null>(null);
  const markSaved = useCallback(() => setSavedAt(new Date()), []);
  const value = useMemo(() => ({ savedAt, markSaved }), [savedAt, markSaved]);
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useSavedAt() {
  return useContext(Ctx);
}

/** "Saved · 14:05" — green for a moment, then settles to muted. Hidden until the first save. */
export function SavedLine({ className }: { className?: string }) {
  const { savedAt } = useSavedAt();
  const [fresh, setFresh] = useState(false);
  useEffect(() => {
    if (!savedAt) return;
    setFresh(true);
    const t = setTimeout(() => setFresh(false), 2500);
    return () => clearTimeout(t);
  }, [savedAt]);
  if (!savedAt) return null;
  const hh = String(savedAt.getHours()).padStart(2, "0");
  const mm = String(savedAt.getMinutes()).padStart(2, "0");
  return (
    <span aria-live="polite" className={cn("tnum text-[11px] transition-colors duration-700", fresh ? "text-ok" : "text-ink-3", className)}>
      Saved · {hh}:{mm}
    </span>
  );
}
