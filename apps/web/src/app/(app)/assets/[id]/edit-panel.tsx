"use client";

import { useRef, useState, useTransition } from "react";
import { ChevronDown } from "lucide-react";
import { updateAsset } from "@/app/asset-actions";
import { Button } from "@/components/ui/button";
import { Input, Select } from "@/components/ui/input";
import { cn } from "@/lib/utils";

type Person = { id: number; displayName: string; department: string | null; status: string };

export function EditPanel({ asset, owner, people, groups }: { asset: { id: number; impact: string; status: string; usageType: string; location: string | null; department: string | null; ownerId: number | null; managedById: number | null; managedByGroupId: number | null; assignedOn: string | null; endOfLife: string | null }; owner: { displayName: string; status: string } | null; managedBy: string | null; group: string | null; people: Person[]; groups: { id: number; name: string }[] }) {
  const [open, setOpen] = useState(true);
  const [pending, start] = useTransition();
  const formRef = useRef<HTMLFormElement>(null);
  const agents = people; // in FS the "Managed by" picker is agents only; keep it simple and searchable via select
  return (
    <form ref={formRef} action={(fd) => start(() => updateAsset(asset.id, fd))} className="px-4 py-3">
      <button type="button" onClick={() => setOpen((o) => !o)} className="mb-3 flex w-full items-center gap-1.5 text-[11.5px] font-medium uppercase tracking-[0.06em] text-ink-3">
        <ChevronDown className={cn("size-3.5 transition-transform", !open && "-rotate-90")} /> Edit properties
        <span className="ml-auto">
          <Button type="submit" variant="primary" size="sm" disabled={pending}>
            Update
          </Button>
        </span>
      </button>
      {open && (
        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-2">
            <L label="Impact">
              <Select name="impact" defaultValue={asset.impact} className="h-8 text-[12.5px]">
                <option value="low">Low</option>
                <option value="medium">Medium</option>
                <option value="high">High</option>
              </Select>
            </L>
            <L label="Asset State">
              <Select name="status" defaultValue={asset.status} className="h-8 text-[12.5px]">
                <option value="in_use">In Use</option>
                <option value="in_stock">In Stock</option>
                <option value="repair">In Repair</option>
                <option value="retired">Retired</option>
              </Select>
            </L>
          </div>
          <L label="Usage type">
            <Select name="usageType" defaultValue={asset.usageType} className="h-8 text-[12.5px]">
              <option value="permanent">Permanent</option>
              <option value="loaner">Loaner</option>
              <option value="shared">Shared</option>
            </Select>
          </L>
          <L label="Location">
            <Select name="location" defaultValue={asset.location ?? ""} className="h-8 text-[12.5px]">
              <option value="">—</option>
              {["Hong Kong", "Kuala Lumpur", "Singapore", "Dubai", "Bangkok", "Manila", "London", "Paris"].map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </Select>
          </L>
          <L label="Department">
            <Select name="department" defaultValue={asset.department ?? ""} className="h-8 text-[12.5px]">
              <option value="">—</option>
              {[...new Set(people.map((p) => p.department).filter(Boolean))].sort().map((d) => (
                <option key={d!} value={d!}>
                  {d}
                </option>
              ))}
            </Select>
          </L>
          <L label="Used By" indent>
            <Select name="ownerId" defaultValue={asset.ownerId ?? ""} className="h-8 text-[12.5px]">
              <option value="">— unassigned (stock) —</option>
              {people.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.displayName}
                  {p.status === "left" || p.status === "offboarding" ? " (Deactivated)" : ""}
                </option>
              ))}
            </Select>
            {owner && (owner.status === "left" || owner.status === "offboarding") && <p className="mt-1 text-[11.5px] text-warn">User is leaving — device should come back to stock.</p>}
          </L>
          <L label="Managed By Group">
            <Select name="managedByGroupId" defaultValue={asset.managedByGroupId ?? ""} className="h-8 text-[12.5px]">
              <option value="">—</option>
              {groups.map((g) => (
                <option key={g.id} value={g.id}>
                  {g.name}
                </option>
              ))}
            </Select>
          </L>
          <L label="Managed By">
            <Select name="managedById" defaultValue={asset.managedById ?? ""} className="h-8 text-[12.5px]">
              <option value="">…</option>
              {agents.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.displayName}
                </option>
              ))}
            </Select>
          </L>
          <L label="Assigned on">
            <Input readOnly value={asset.assignedOn ? new Date(asset.assignedOn).toLocaleString("en-GB", { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" }) : "—"} className="h-8 bg-surface-2 text-[12.5px] text-ink-2" />
          </L>
          <L label="End of Life">
            <Input type="date" name="endOfLife" defaultValue={asset.endOfLife ?? ""} className="h-8 text-[12.5px]" />
          </L>
          <div className="flex justify-end pt-1">
            <Button type="submit" variant="primary" size="sm" disabled={pending}>
              {pending ? "Saving…" : "Update"}
            </Button>
          </div>
          <p className="text-[11px] text-ink-4">Every change is written to the activity log with before/after values. Re-assigning resets acknowledgement and starts a new assignment record.</p>
        </div>
      )}
    </form>
  );
}

function L({ label, children, indent }: { label: string; children: React.ReactNode; indent?: boolean }) {
  return (
    <label className={cn("block", indent && "pl-2")}>
      <span className="mb-1 block text-[11.5px] text-ink-3">{label}</span>
      {children}
    </label>
  );
}
