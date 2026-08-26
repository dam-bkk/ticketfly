"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { Check, Pencil } from "lucide-react";
import { updateAssetField, type AssetField } from "@/app/asset-actions";
import { Input, Select } from "@/components/ui/input";
import { cn } from "@/lib/utils";

type Option = { value: string; label: string };

/**
 * Click-to-edit value for the asset body. Renders the styled Select / Input on click,
 * saves on change / blur / Enter through the same update action as everything else,
 * and shows a short "Saved" tick. Escape cancels without saving.
 */
export function InlineField({ assetId, field, value, kind = "select", options = [], placeholder, hint }: { assetId: number; field: AssetField; value: string; kind?: "select" | "text" | "date"; options?: Option[]; placeholder?: string; hint?: string }) {
  const [editing, setEditing] = useState(false);
  const [saved, setSaved] = useState(false);
  const [current, setCurrent] = useState(value);
  const [pending, start] = useTransition();
  const cancelled = useRef(false);
  const inflight = useRef(false);

  useEffect(() => setCurrent(value), [value]);

  const label = kind === "select" ? (options.find((o) => o.value === current)?.label ?? (current || "—")) : current || "—";

  const commit = (next: string) => {
    if (cancelled.current) {
      cancelled.current = false;
      setEditing(false);
      return;
    }
    if (next === current || inflight.current) {
      if (!inflight.current) setEditing(false);
      return;
    }
    inflight.current = true;
    start(async () => {
      try {
        await updateAssetField(assetId, field, next);
        setCurrent(next);
        setSaved(true);
        setTimeout(() => setSaved(false), 1800);
      } finally {
        inflight.current = false;
        setEditing(false);
      }
    });
  };
  const onKey = (e: React.KeyboardEvent<HTMLInputElement | HTMLSelectElement>) => {
    if (e.key === "Escape") {
      cancelled.current = true;
      (e.target as HTMLElement).blur();
    } else if (e.key === "Enter" && kind !== "select") {
      e.preventDefault();
      (e.target as HTMLElement).blur();
    }
  };

  if (editing) {
    const cls = "h-7 max-w-[320px] text-[12.5px]";
    return (
      <span className="-my-0.5 block" aria-busy={pending}>
        {kind === "select" ? (
          <Select autoFocus defaultValue={current} onChange={(e) => commit(e.target.value)} onBlur={(e) => commit(e.target.value)} onKeyDown={onKey} className={cls}>
            {options.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </Select>
        ) : (
          <Input autoFocus type={kind === "date" ? "date" : "text"} defaultValue={current} placeholder={placeholder} onBlur={(e) => commit(e.target.value)} onKeyDown={onKey} className={cls} />
        )}
      </span>
    );
  }

  return (
    <span className="-ml-1.5 block min-w-0 max-w-full">
      <button type="button" onClick={() => setEditing(true)} aria-busy={pending} className={cn("group inline-flex h-7 max-w-full items-center gap-1.5 rounded-md px-1.5 text-left font-medium hover:bg-surface-2 focus-visible:shadow-[0_0_0_3px_var(--ring)] focus-visible:outline-none", pending && "opacity-60")} title="Click to edit">
        <span className="truncate">{label}</span>
        {saved ? (
          <span className="inline-flex items-center gap-1 text-[11px] font-medium text-ok">
            <Check className="size-3" strokeWidth={2.5} /> Saved
          </span>
        ) : (
          <Pencil className="size-3 shrink-0 text-ink-3 opacity-0 transition-opacity group-hover:opacity-100 group-focus-visible:opacity-100" />
        )}
      </button>
      {hint && <span className="mt-0.5 block pl-1.5 text-[11px] text-warn">{hint}</span>}
    </span>
  );
}
