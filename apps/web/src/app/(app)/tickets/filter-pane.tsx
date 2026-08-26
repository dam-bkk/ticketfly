"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { Bookmark, Check, SlidersHorizontal, Trash2, X } from "lucide-react";
import { deleteSavedView, saveView } from "@/app/extra-actions";
import { Button } from "@/components/ui/button";
import { Field, Input, Select } from "@/components/ui/input";
import { cn } from "@/lib/utils";

export type ListFilter = { f?: string; q?: string; group?: string; agent?: string; status?: string; requester?: string; department?: string; created?: string; due?: string; fr?: string; priority?: string; source?: string; view?: string };
type Opt = { id: number; name: string };
export type SavedView = { id: number; name: string; shared: boolean; ownerId: number | null; filter: ListFilter };

/** Freshservice's Basic / Advanced filter pane, in the same place, with the same fields — plus Save as view. */
export function FilterPane({ current, groups, agents, departments, views, meId }: { current: ListFilter; groups: Opt[]; agents: Opt[]; departments: string[]; views: SavedView[]; meId: number }) {
  const router = useRouter();
  const [f, setF] = useState<ListFilter>(current);
  const [name, setName] = useState("");
  const [saving, setSaving] = useState(false);
  const [pending, start] = useTransition();
  const set = (k: keyof ListFilter) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => setF((s) => ({ ...s, [k]: e.target.value || undefined }));
  const toggle = (k: keyof ListFilter, v: string) => () => setF((s) => ({ ...s, [k]: s[k] === v ? undefined : v }));
  const href = (x: ListFilter) => {
    const p = new URLSearchParams();
    for (const [k, v] of Object.entries(x)) if (v && k !== "view") p.set(k, String(v));
    return `/tickets${p.size ? `?${p}` : ""}`;
  };
  const apply = () => router.push(href(f));
  const active = Object.entries(f).filter(([k, v]) => v && k !== "f" && k !== "view").length;
  return (
    <aside className="w-[252px] shrink-0 overflow-y-auto bg-surface px-4 py-4 hairline-l">
      <div className="mb-3 flex items-center gap-2">
        <SlidersHorizontal className="size-3.5 text-ink-3" />
        <p className="text-[12.5px] font-medium">Filters</p>
        {active > 0 && <span className="tnum rounded bg-accent-soft px-1.5 text-[11px] font-medium text-accent-ink">{active}</span>}
        <button onClick={() => router.push("/tickets")} className="ml-auto text-[12px] text-ink-3 hover:text-ink">Reset</button>
      </div>

      <div className="mb-4">
        <p className="label mb-1.5">Saved views</p>
        <ul className="space-y-0.5">
          {views.map((v) => (
            <li key={v.id} className="group flex items-center gap-1">
              <button onClick={() => router.push(href({ ...v.filter, view: String(v.id) }))} className={cn("flex h-7 min-w-0 flex-1 items-center gap-1.5 rounded-md px-2 text-left text-[12.5px] hover:bg-surface-2", current.view === String(v.id) && "bg-accent-soft text-accent-ink")}>
                <Bookmark className="size-3 shrink-0" />
                <span className="truncate">{v.name}</span>
                {v.shared && <span className="ml-auto text-[10px] text-ink-4">shared</span>}
                {current.view === String(v.id) && <Check className="size-3 shrink-0" />}
              </button>
              {(v.ownerId === meId || !v.shared) && (
                <button onClick={() => start(() => deleteSavedView(v.id))} aria-label="Delete view" className="rounded p-1 text-ink-4 opacity-0 hover:bg-crit-soft hover:text-crit group-hover:opacity-100"><Trash2 className="size-3" /></button>
              )}
            </li>
          ))}
          {views.length === 0 && <li className="px-2 text-[12px] text-ink-3">None yet — filter, then save.</li>}
        </ul>
        {saving ? (
          <form
            action={(fd) => {
              fd.set("filter", JSON.stringify(f));
              start(async () => {
                await saveView(fd);
                setSaving(false);
                setName("");
              });
            }}
            className="mt-2 space-y-1.5"
          >
            <Input name="name" value={name} onChange={(e) => setName(e.target.value)} required placeholder="e.g. Infra – All Unresolved" className="h-8 text-[12.5px]" />
            <label className="flex items-center gap-2 text-[12px] text-ink-2"><input type="checkbox" name="shared" className="accent-[var(--accent)]" /> Share with the team</label>
            <div className="flex gap-1.5">
              <Button type="submit" size="sm" variant="primary" disabled={pending}><Check className="size-3.5" /> Save</Button>
              <Button type="button" size="sm" variant="ghost" onClick={() => setSaving(false)}><X className="size-3.5" /></Button>
            </div>
          </form>
        ) : (
          <button onClick={() => setSaving(true)} className="mt-1.5 text-[12px] font-medium text-accent-ink hover:underline">+ Save current filter as a view</button>
        )}
      </div>

      <div className="space-y-3 hairline-t pt-3">
        <Field label="Agents">
          <Select value={f.agent ?? ""} onChange={set("agent")} className="h-8 text-[12.5px]">
            <option value="">Any</option>
            <option value="me">Me</option>
            <option value="unassigned">Unassigned</option>
            {agents.map((a) => <option key={a.id} value={a.id}>{a.name}</option>)}
          </Select>
        </Field>
        <Field label="Groups">
          <Select value={f.group ?? ""} onChange={set("group")} className="h-8 text-[12.5px]">
            <option value="">Any</option>
            {groups.map((g) => <option key={g.id} value={g.id}>{g.name}</option>)}
          </Select>
        </Field>
        <Field label="Status">
          <Select value={f.status ?? ""} onChange={set("status")} className="h-8 text-[12.5px]">
            <option value="">All Unresolved</option>
            <option value="open">Open</option>
            <option value="in_progress">Being processed</option>
            <option value="pending">Pending</option>
            <option value="pending_approval">Pending approval</option>
            <option value="on_hold">On hold</option>
            <option value="resolved">Resolved</option>
            <option value="closed">Closed</option>
            <option value="cancelled">Cancelled</option>
            <option value="transferred">Transferred</option>
            <option value="any">Any</option>
          </Select>
        </Field>
        <Field label="Requesters"><Input value={f.requester ?? ""} onChange={set("requester")} placeholder="Search name or email" className="h-8 text-[12.5px]" /></Field>
        <Field label="Departments">
          <Select value={f.department ?? ""} onChange={set("department")} className="h-8 text-[12.5px]">
            <option value="">Select</option>
            {departments.map((d) => <option key={d} value={d}>{d}</option>)}
          </Select>
        </Field>
        <Field label="Created">
          <Select value={f.created ?? ""} onChange={set("created")} className="h-8 text-[12.5px]">
            <option value="">Select a time period</option>
            <option value="today">Today</option>
            <option value="7d">Last 7 days</option>
            <option value="30d">Last 30 days</option>
            <option value="6m">Last 6 months</option>
          </Select>
        </Field>
        <Checks label="Due by" value={f.due} options={[["overdue", "Overdue"], ["today", "Due Today"], ["tomorrow", "Tomorrow"], ["8h", "Next 8 Hours"]]} onToggle={(v) => toggle("due", v)()} />
        <Checks label="First response" value={f.fr} options={[["overdue", "Overdue"], ["today", "Due Today"]]} onToggle={(v) => toggle("fr", v)()} />
        <Checks label="Priority" value={f.priority} options={[["low", "Low"], ["medium", "Medium"], ["high", "High"], ["urgent", "Urgent"]]} onToggle={(v) => toggle("priority", v)()} />
        <Checks label="Source" value={f.source} options={[["portal", "Portal"], ["email", "Email"], ["agent", "Agent"], ["system", "Automation"]]} onToggle={(v) => toggle("source", v)()} />
        <div className="flex gap-2 pt-1">
          <Button variant="primary" size="sm" onClick={apply} className="flex-1">Apply</Button>
        </div>
      </div>
    </aside>
  );
}

function Checks({ label, value, options, onToggle }: { label: string; value?: string; options: [string, string][]; onToggle: (v: string) => void }) {
  return (
    <div>
      <p className="mb-1 text-[12px] text-ink-3">{label}</p>
      <div className="space-y-0.5">
        {options.map(([v, l]) => (
          <label key={v} className="flex cursor-pointer items-center gap-2 text-[12.5px]">
            <input type="checkbox" checked={value === v} onChange={() => onToggle(v)} className="size-3.5 accent-[var(--accent)]" /> {l}
          </label>
        ))}
      </div>
    </div>
  );
}
