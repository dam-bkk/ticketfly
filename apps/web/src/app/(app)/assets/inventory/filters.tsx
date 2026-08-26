"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { SlidersHorizontal } from "lucide-react";
import type { InventoryFilter } from "@/lib/assets";
import { Field, Input, Select } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

/** Freshservice keeps filters in a right-hand pane; we keep the same place and the same field names. */
export function FilterPanel({ current, facets }: { current: InventoryFilter; facets: { locations: [string, number][]; departments: [string, number][]; types: [string, number][] } }) {
  const router = useRouter();
  const [f, setF] = useState<InventoryFilter>(current);
  const set = (k: keyof InventoryFilter) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => setF((s) => ({ ...s, [k]: e.target.value || undefined }));
  const apply = () => {
    const p = new URLSearchParams();
    for (const [k, v] of Object.entries(f)) if (v && k !== "page") p.set(k, String(v));
    router.push(`/assets/inventory${p.size ? `?${p}` : ""}`);
  };
  return (
    <aside className="w-[236px] shrink-0 overflow-y-auto bg-surface px-4 py-4 hairline-l">
      <div className="mb-3 flex items-center gap-2">
        <SlidersHorizontal className="size-3.5 text-ink-3" />
        <p className="text-[12.5px] font-medium">Filters</p>
      </div>
      <div className="space-y-3">
        <Field label="Workspace">
          <Select defaultValue="it" className="h-8 text-[12.5px]">
            <option value="it">IT Division</option>
          </Select>
        </Field>
        <Field label="Asset Type">
          <Select value={f.type ?? ""} onChange={set("type")} className="h-8 text-[12.5px]">
            <option value="">All Assets</option>
            {facets.types.map(([v, n]) => (
              <option key={v} value={v}>
                {v[0]!.toUpperCase() + v.slice(1)} ({n})
              </option>
            ))}
          </Select>
        </Field>
        <Field label="Used By">
          <Input value={f.usedBy ?? ""} onChange={set("usedBy")} placeholder="Name or Email" className="h-8 text-[12.5px]" />
        </Field>
        <Field label="Department">
          <Select value={f.department ?? ""} onChange={set("department")} className="h-8 text-[12.5px]">
            <option value="">Any</option>
            {facets.departments.map(([v, n]) => (
              <option key={v} value={v}>
                {v} ({n})
              </option>
            ))}
          </Select>
        </Field>
        <Field label="Location">
          <Select value={f.location ?? ""} onChange={set("location")} className="h-8 text-[12.5px]">
            <option value="">Select Location</option>
            {facets.locations.map(([v, n]) => (
              <option key={v} value={v}>
                {v} ({n})
              </option>
            ))}
          </Select>
        </Field>
        <Field label="Managed By">
          <Input value={f.managedBy ?? ""} onChange={set("managedBy")} placeholder="Agent name" className="h-8 text-[12.5px]" />
        </Field>
        <Field label="Asset State">
          <Select value={f.status ?? ""} onChange={set("status")} className="h-8 text-[12.5px]">
            <option value="">Any</option>
            <option value="in_use">In Use</option>
            <option value="in_stock">In Stock</option>
            <option value="repair">In Repair</option>
            <option value="retired">Retired</option>
          </Select>
        </Field>
        <Field label="Impact">
          <Select value={f.impact ?? ""} onChange={set("impact")} className="h-8 text-[12.5px]">
            <option value="">Any</option>
            <option value="low">Low</option>
            <option value="medium">Medium</option>
            <option value="high">High</option>
          </Select>
        </Field>
        <Field label="Sources">
          <Select value={f.source ?? ""} onChange={set("source")} className="h-8 text-[12.5px]">
            <option value="">Any</option>
            <option value="intune">Intune</option>
            <option value="defender">Defender</option>
            <option value="manual">Manual</option>
          </Select>
        </Field>
        <div className="flex gap-2 pt-1">
          <Button variant="primary" size="sm" onClick={apply} className="flex-1">
            Apply
          </Button>
          <Button variant="ghost" size="sm" onClick={() => router.push("/assets/inventory")}>
            Reset
          </Button>
        </div>
      </div>
    </aside>
  );
}
