"use client";

import { useMemo, useState } from "react";
import { X } from "lucide-react";
import { Avatar } from "@/components/ui/avatar";

type P = { id: number; displayName: string; jobTitle: string | null; department: string | null };

export function PersonPicker({ name, people, required, exclude }: { name: string; people: P[]; required?: boolean; exclude?: number }) {
  const [q, setQ] = useState("");
  const [sel, setSel] = useState<P | null>(null);
  const list = useMemo(() => {
    const t = q.trim().toLowerCase();
    if (!t) return [];
    return people.filter((p) => p.id !== exclude && `${p.displayName} ${p.jobTitle} ${p.department}`.toLowerCase().includes(t)).slice(0, 6);
  }, [q, people, exclude]);
  if (sel) {
    return (
      <div className="flex h-11 items-center gap-3 rounded-md bg-surface-2 px-3">
        <input type="hidden" name={name} value={sel.displayName} />
        <Avatar name={sel.displayName} size={24} />
        <span className="min-w-0 flex-1 truncate text-[13.5px]">
          <span className="font-medium">{sel.displayName}</span> <span className="text-ink-3">· {sel.jobTitle}</span>
        </span>
        <button type="button" onClick={() => setSel(null)} aria-label="Clear" className="text-ink-3 hover:text-ink">
          <X className="size-4" />
        </button>
      </div>
    );
  }
  return (
    <div className="relative">
      <input value={q} onChange={(e) => setQ(e.target.value)} required={required} placeholder="Start typing a name" className="h-9 w-full rounded-md bg-surface px-3 text-[13.5px] hairline focus:outline-none focus:shadow-[inset_0_0_0_1px_var(--accent),0_0_0_3px_var(--ring)]" />
      {list.length > 0 && (
        <ul className="absolute inset-x-0 top-full z-20 mt-1 rounded-lg bg-surface p-1 shadow-3 hairline">
          {list.map((p) => (
            <li key={p.id}>
              <button
                type="button"
                onClick={() => {
                  setSel(p);
                  setQ("");
                }}
                className="flex w-full items-center gap-2.5 rounded-md px-2 py-1.5 text-left hover:bg-surface-2"
              >
                <Avatar name={p.displayName} size={22} />
                <span className="min-w-0 flex-1 truncate text-[13px]">
                  <span className="font-medium">{p.displayName}</span> <span className="text-ink-3">· {p.jobTitle}, {p.department}</span>
                </span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
