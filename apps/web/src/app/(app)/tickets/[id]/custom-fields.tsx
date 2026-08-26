"use client";

import { useTransition } from "react";
import { saveTicketCustomValue } from "@/app/extra-actions";
import { Input, Select, Textarea } from "@/components/ui/input";
import { useSavedAt } from "./saved-at";

type F = { id: number; key: string; label: string; type: string; options: string[]; required: boolean };

/** Field Manager fields in the ticket properties rail. Autosave on change/blur — same model as Properties above. */
export function CustomFields({ ticketId, fields, values }: { ticketId: number; fields: F[]; values: Record<string, string> }) {
  const [pending, start] = useTransition();
  const { markSaved } = useSavedAt();
  if (!fields.length) return null;
  const save = (key: string, value: string) => {
    if ((values[key] ?? "") === value) return;
    start(async () => {
      await saveTicketCustomValue(ticketId, key, value);
      markSaved();
    });
  };
  return (
    <section className="space-y-2 px-5 py-4 hairline-t" aria-busy={pending}>
      <p className="label">Custom fields</p>
      {fields.map((f) => (
        <div key={f.id} className="grid grid-cols-[76px_minmax(0,1fr)] items-center gap-2">
          <span className="truncate text-[12.5px] text-ink-3" title={f.label}>{f.label}</span>
          {f.type === "select" ? (
            <Select defaultValue={values[f.key] ?? ""} onChange={(e) => save(f.key, e.target.value)} className="h-8 text-[13px]">
              <option value="">—</option>
              {f.options.map((o) => <option key={o} value={o}>{o}</option>)}
            </Select>
          ) : f.type === "toggle" ? (
            <label className="flex h-8 items-center gap-2 text-[13px]">
              <input type="checkbox" defaultChecked={values[f.key] === "Yes"} onChange={(e) => save(f.key, e.target.checked ? "Yes" : "No")} className="accent-[var(--accent)]" />
              <span className="text-ink-2">{values[f.key] === "Yes" ? "Yes" : "No"}</span>
            </label>
          ) : f.type === "textarea" ? (
            <Textarea defaultValue={values[f.key] ?? ""} onBlur={(e) => save(f.key, e.target.value)} className="min-h-16 resize-none text-[13px]" />
          ) : (
            <Input type={f.type === "date" ? "date" : "text"} defaultValue={values[f.key] ?? ""} onBlur={(e) => save(f.key, e.target.value)} onKeyDown={(e) => { if (e.key === "Enter") (e.target as HTMLInputElement).blur(); }} className="h-8 w-full min-w-0 text-[13px]" />
          )}
        </div>
      ))}
    </section>
  );
}
