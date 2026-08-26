"use client";

import { useRef, useState, useTransition } from "react";
import Link from "next/link";
import { ChevronRight, CornerDownRight, Plus, Trash2 } from "lucide-react";
import { addProjectRow, deleteProjectRow, indentProjectRow, updateProjectRow } from "@/app/module-actions";
import { Button } from "@/components/ui/button";
import { Input, Select } from "@/components/ui/input";
import { cn } from "@/lib/utils";

export type GridRow = { id: number; parentId: number | null; title: string; status: string; ownerId: number | null; owner: string | null; startDate: string | null; endDate: string | null; percent: number; priority: string; notes: string | null; ticketId: number | null };

const STATUS: [string, string, string][] = [["not_started", "Not started", "bg-surface-3 text-ink-2"], ["in_progress", "In progress", "bg-accent-soft text-accent-ink"], ["blocked", "Blocked", "bg-crit-soft text-crit"], ["done", "Done", "bg-ok-soft text-ok"]];
const COLS = ["title", "status", "owner", "start", "end", "percent", "priority", "notes"] as const;
/** # · Task · Status · Owner · Start · End · % done · Priority · Notes (row actions live inside the Notes cell on hover). */
const TEMPLATE = "40px minmax(240px,1.6fr) 136px minmax(150px,1fr) 128px 128px 112px 104px minmax(170px,1fr)";

/**
 * Sheet-style grid: click or Tab into a cell, type, Enter/blur saves. Arrow keys move, Enter on the last column adds a row.
 */
export function Grid({ projectId, rows, people }: { projectId: number; rows: GridRow[]; people: { id: number; displayName: string }[] }) {
  const [pending, start] = useTransition();
  const [active, setActive] = useState<{ r: number; c: number } | null>(null);
  const gridRef = useRef<HTMLDivElement>(null);

  const save = (row: GridRow, patch: Parameters<typeof updateProjectRow>[1]) => start(() => updateProjectRow(row.id, patch));
  const focus = (r: number, c: number) => {
    const el = gridRef.current?.querySelector<HTMLElement>(`[data-cell="${r}-${c}"]`);
    el?.focus();
    setActive({ r, c });
  };
  const onKey = (e: React.KeyboardEvent, r: number, c: number, row: GridRow) => {
    const isSelect = (e.target as HTMLElement).tagName === "SELECT";
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      (e.target as HTMLElement).blur();
      if (r === rows.length - 1 && c === COLS.length - 1) start(() => addProjectRow(projectId, row.id));
      else focus(Math.min(rows.length - 1, r + 1), c);
    } else if (e.key === "Tab") {
      e.preventDefault();
      const next = e.shiftKey ? c - 1 : c + 1;
      if (next < 0) focus(Math.max(0, r - 1), COLS.length - 1);
      else if (next >= COLS.length) focus(Math.min(rows.length - 1, r + 1), 0);
      else focus(r, next);
    } else if (e.key === "ArrowDown" && !isSelect) focus(Math.min(rows.length - 1, r + 1), c);
    else if (e.key === "ArrowUp" && !isSelect) focus(Math.max(0, r - 1), c);
    else if (e.key === "Escape") (e.target as HTMLElement).blur();
  };

  const field = "h-9 w-full rounded-none bg-transparent px-2 text-[13.5px] focus:bg-accent-soft/40";
  const flat = { boxShadow: "none" } as const;

  return (
    <div className="p-4" aria-busy={pending}>
      <div className="mb-2 flex items-center gap-3 text-[12.5px] text-ink-3">
        <span>Type into any cell · Enter saves and moves down · Tab moves across · Enter on the last cell adds a row</span>
        <Button size="sm" variant="secondary" onClick={() => start(() => addProjectRow(projectId))} className="ml-auto">
          <Plus className="size-3.5" /> Add row
        </Button>
      </div>
      <div className="overflow-x-auto rounded-lg bg-surface hairline">
        <div ref={gridRef} role="grid" className="min-w-[1180px]">
          <div role="row" className="grid h-8 items-center bg-surface-2 [&>span]:px-2" style={{ gridTemplateColumns: TEMPLATE }}>
            <span className="label text-center">#</span>
            <span className="label">Task</span>
            <span className="label">Status</span>
            <span className="label">Owner</span>
            <span className="label">Start</span>
            <span className="label">End</span>
            <span className="label">% done</span>
            <span className="label">Priority</span>
            <span className="label">Notes</span>
          </div>
          {rows.map((row, r) => {
            const child = !!row.parentId;
            const cell = (c: number, extra = "") => cn("relative flex h-9 min-w-0 items-center hairline-t", c < COLS.length - 1 && "hairline-r", active?.r === r && active?.c === c && "z-10 shadow-[inset_0_0_0_2px_var(--accent)]", extra);
            return (
              <div key={row.id} role="row" className={cn("group grid", child && "bg-surface-2/30")} style={{ gridTemplateColumns: TEMPLATE }}>
                <span className="tnum flex h-9 items-center justify-center text-[11px] text-ink-3 hairline-t hairline-r">{r + 1}</span>
                <span className={cell(0)}>
                  {child ? <CornerDownRight className="ml-2 size-3.5 shrink-0 text-ink-3" /> : <ChevronRight className="ml-1 size-3.5 shrink-0 opacity-0" />}
                  <Input style={flat} data-cell={`${r}-0`} defaultValue={row.title} placeholder="Task name" onFocus={() => setActive({ r, c: 0 })} onKeyDown={(e) => onKey(e, r, 0, row)} onBlur={(e) => e.target.value !== row.title && save(row, { title: e.target.value })} className={cn(field, !child && row.title && "font-medium")} />
                </span>
                <span className={cell(1, "px-1.5")}>
                  <span className="w-full"><Select style={flat} data-cell={`${r}-1`} defaultValue={row.status} onFocus={() => setActive({ r, c: 1 })} onKeyDown={(e) => onKey(e, r, 1, row)} onChange={(e) => save(row, { status: e.target.value })} className={cn("h-7 px-2 text-[12.5px] font-medium", STATUS.find((s) => s[0] === row.status)?.[2])}>
                    {STATUS.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
                  </Select></span>
                </span>
                <span className={cell(2)}>
                  <span className="min-w-0 flex-1"><Select style={flat} data-cell={`${r}-2`} defaultValue={row.ownerId ?? ""} onFocus={() => setActive({ r, c: 2 })} onKeyDown={(e) => onKey(e, r, 2, row)} onChange={(e) => save(row, { ownerId: e.target.value ? Number(e.target.value) : null })} className={cn(field, "truncate pr-7")}>
                    <option value="">—</option>
                    {people.map((p) => <option key={p.id} value={p.id}>{p.displayName}</option>)}
                  </Select></span>
                </span>
                <span className={cell(3)}>
                  <Input style={flat} data-cell={`${r}-3`} type="date" defaultValue={row.startDate ?? ""} onFocus={() => setActive({ r, c: 3 })} onKeyDown={(e) => onKey(e, r, 3, row)} onBlur={(e) => e.target.value !== (row.startDate ?? "") && save(row, { startDate: e.target.value || null })} className={cn(field, "tnum")} />
                </span>
                <span className={cell(4)}>
                  <Input style={flat} data-cell={`${r}-4`} type="date" defaultValue={row.endDate ?? ""} onFocus={() => setActive({ r, c: 4 })} onKeyDown={(e) => onKey(e, r, 4, row)} onBlur={(e) => e.target.value !== (row.endDate ?? "") && save(row, { endDate: e.target.value || null })} className={cn(field, "tnum")} />
                </span>
                <span className={cell(5, "gap-1.5 pr-2")}>
                  <Input style={flat} data-cell={`${r}-5`} type="number" min={0} max={100} defaultValue={row.percent} onFocus={() => setActive({ r, c: 5 })} onKeyDown={(e) => onKey(e, r, 5, row)} onBlur={(e) => Number(e.target.value) !== row.percent && save(row, { percent: Math.max(0, Math.min(100, Number(e.target.value))) })} className={cn(field, "tnum w-12 shrink-0 pr-0")} />
                  <span className="bar w-11 shrink-0"><i style={{ width: `${row.percent}%`, background: row.percent === 100 ? "var(--ok)" : undefined }} /></span>
                </span>
                <span className={cell(6)}>
                  <span className="min-w-0 flex-1"><Select style={flat} data-cell={`${r}-6`} defaultValue={row.priority} onFocus={() => setActive({ r, c: 6 })} onKeyDown={(e) => onKey(e, r, 6, row)} onChange={(e) => save(row, { priority: e.target.value })} className={cn(field, "pr-7", row.priority === "high" && "text-warn", row.priority === "low" && "text-ink-3")}>
                    {["low", "medium", "high"].map((v) => <option key={v} value={v}>{v[0]!.toUpperCase() + v.slice(1)}</option>)}
                  </Select></span>
                </span>
                <span className={cell(7)}>
                  <Input style={flat} data-cell={`${r}-7`} defaultValue={row.notes ?? ""} placeholder="Add a note" onFocus={() => setActive({ r, c: 7 })} onKeyDown={(e) => onKey(e, r, 7, row)} onBlur={(e) => e.target.value !== (row.notes ?? "") && save(row, { notes: e.target.value || null })} className={cn(field, "pr-24 text-ink-2")} />
                  <span className="absolute inset-y-0 right-1 flex items-center gap-0.5 opacity-0 transition-opacity group-hover:opacity-100 group-focus-within:opacity-100">
                    {row.ticketId && <Link href={`/tickets/${row.ticketId}`} className="rounded px-1 text-[11px] font-medium text-accent-ink hover:underline">Ticket</Link>}
                    <button type="button" title={child ? "Outdent" : "Indent under previous row"} onClick={() => start(() => indentProjectRow(row.id, child ? "out" : "in"))} className="rounded p-1 text-ink-3 hover:bg-surface-2 hover:text-ink"><CornerDownRight className={cn("size-3.5", child && "rotate-180")} /></button>
                    <button type="button" title="Insert row below" onClick={() => start(() => addProjectRow(projectId, row.id))} className="rounded p-1 text-ink-3 hover:bg-surface-2 hover:text-ink"><Plus className="size-3.5" /></button>
                    <button type="button" title="Delete row" onClick={() => start(() => deleteProjectRow(row.id))} className="rounded p-1 text-ink-3 hover:bg-crit-soft hover:text-crit"><Trash2 className="size-3.5" /></button>
                  </span>
                </span>
              </div>
            );
          })}
        </div>
      </div>
      <p className="mt-2 text-[11px] text-ink-3">Every cell change is saved immediately and recorded in the activity log. Marking Done sets 100%; 100% marks Done.</p>
    </div>
  );
}
