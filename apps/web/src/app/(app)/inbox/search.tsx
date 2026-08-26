"use client";

import { Search, X } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

export function InboxSearch({ filter, q }: { filter: string; q: string }) {
  const [v, setV] = useState(q);
  const router = useRouter();
  useEffect(() => setV(q), [q]);
  useEffect(() => {
    if (v === q) return;
    const t = setTimeout(() => router.replace(`/inbox?f=${filter}${v ? `&q=${encodeURIComponent(v)}` : ""}`), 250);
    return () => clearTimeout(t);
  }, [v, q, filter, router]);
  return (
    <label className="flex h-7 w-60 items-center gap-2 rounded-md bg-surface-2 px-2 text-[12.5px] focus-within:shadow-[0_0_0_2px_var(--ring)]">
      <Search className="size-3.5 text-ink-3" />
      <input value={v} onChange={(e) => setV(e.target.value)} placeholder="Filter this view" className="flex-1 bg-transparent outline-none" />
      {v && (
        <button onClick={() => setV("")} aria-label="Clear" className="text-ink-3 hover:text-ink">
          <X className="size-3.5" />
        </button>
      )}
    </label>
  );
}
