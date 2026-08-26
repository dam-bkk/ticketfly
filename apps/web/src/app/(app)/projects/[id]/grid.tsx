"use client";

import { useRef, useState, useTransition } from "react";
import Link from "next/link";
import { ChevronRight, CornerDownRight, Plus, Trash2 } from "lucide-react";
import { addProjectRow, deleteProjectRow, indentProjectRow, updateProjectRow } from "@/app/module-actions";
import { cn } from "@/lib/utils";

export type GridRow = { id: number; parentId: number | null; title: string; status: string; ownerId: number | null; owner: string | null; startDate: string | null; endDate: string | null; percent: number; priority: string; notes: string | null; ticketId: number | null };

const STATUS: [string, string, string][] = [["not_started", "Not started", "bg-surface-3 text-ink-2"], ["in_progress", "In progress", "bg-accent-soft text-accent-ink"], ["blocked", "Blocked", "bg-crit-soft text-crit"], ["done", "Done", "bg-ok-soft text-ok"]];
const COLS = ["title", "status", "owner", "start", "end", "percent", "priority", "notes"] as const;

/**
 * Sheet-style grid: click or Tab into a cell, type, Enter/blur saves. Arrow keys move, Enter on the last column adds a row.
 * No library — the point is that it feels like the sheet people already use.
 */
export function Grid({ projectId, rows, people }: { projectId: number; rows: GridRow[]; people: { id: number; displayName: string }[] }) {
  const [pending, start] = useTransition();
  const [active, setActive] = useState<{ r: number; c: number } | null>(null);
  const tableRef = useRef<HTMLTableElement>(null);

  const save = (row: GridRow, patch: Parameters<typeof updateProjectRow>[1]) => start(() => updateProjectRow(row.id, patch));
  const focus = (r: number, c: number) => {
    const el = tableRef.current?.querySelector<HTMLElement>(`[data-cell="${r}-${c}"]`);
    el?.focus();
    setActive({ r, c });
  };
  const onKey = (e: React.KeyboardEvent, r: number, c: number, row: GridRow) => {
    const isEditable = (e.target as HTMLElement).tagName === "INPUT" || (e.target as HTMLElement).tagName === "SELECT";
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
    } else if (e.key === "ArrowDown" && !(isEditable && (e.target as HTMLElement).tagName === "SELECT")) focus(Math.min(rows.length - 1, r + 1), c);
    else if (e.key === "ArrowUp" && !(isEditable && (e.target as HTMLElement).tagName === "SELECT")) focus(Math.max(0, r - 1), c);
    else if (e.key === "Escape") (e.target as HTMLElement).blur();
  };

  return (
    <div className="p-4" aria-busy={pending}>
      <div className="mb-2 flex items-center gap-3 text-[12px] text-ink-3">
        <span>Type into any cell · Enter saves and moves down · Tab moves across · Enter on the last cell adds a row</span>
        <button onClick={() => start(() => addProjectRow(projectId))} className="ml-auto inline-flex h-7 items-center gap-1 rounded-md px-2 text-[12.5px] font-medium text-ink-2 hairline hover:bg-surface-2">
          <Plus className="size-3.5" /> Add row
        </button>
      </div>
      <div className="overflow-x-auto rounded-lg bg-surface hairline">
        <table ref={tableRef} className="w-full min-w-[1100px] border-collapse text-[13px]">
          <thead>
            <tr className="bg-surface-2 text-left [&>th]:h-8 [&>th]:px-2 [&>th]:font-medium [&>th]:text-[11px] [&>th]:uppercase [&>th]:tracking-[0.06em] [&>th]:text-ink-3">
              <th className="w-10 text-center">#</th>
              <th className="w-[34%]">Task</th>
              <th className="w-28">Status</th>
              <th className="w-40">Owner</th>
              <th className="w-32">Start</th>
              <th className="w-32">End</th>
              <th className="w-24">% done</th>
              <th className="w-24">Priority</th>
              <th>Notes</th>
              <th className="w-20" />
            </tr>
          </thead>
          <tbody>
            {rows.map((row, r) => {
              const child = !!row.parentId;
              const cell = (c: number, extra = "") => cn("h-9 px-0 align-middle hairline-t hairline-r", active?.r === r && active?.c === c && "shadow-[inset_0_0_0_2px_var(--accent)] relative z-10", extra);
              const input = "h-9 w-full bg-transparent px-2 text-[13px] outline-none focus:bg-accent-soft/40";
              return (
                <tr key={row.id} className={cn("group", child && "bg-surface-2/30")}>
                  <td className="tnum h-9 text-center text-[11.5px] text-ink-4 hairline-t hairline-r">{r + 1}</td>
                  <td className={cell(0)}>
                    <div className="flex items-center">
                      {child ? <CornerDownRight className="ml-2 size-3.5 shrink-0 text-ink-4" /> : <ChevronRight className="ml-1 size-3.5 shrink-0 text-ink-4 opacity-0" />}
                      <input data-cell={`${r}-0`} defaultValue={row.title} placeholder="Task name" onFocus={() => setActive({ r, c: 0 })} onKeyDown={(e) => onKey(e, r, 0, row)} onBlur={(e) => e.target.value !== row.title && save(row, { title: e.target.value })} className={cn(input, !child && row.title && "font-medium")} />
                    </div>
                  </td>
                  <td className={cell(1)}>
                    <select data-cell={`${r}-1`} defaultValue={row.status} onFocus={() => setActive({ r, c: 1 })} onKeyDown={(e) => onKey(e, r, 1, row)} onChange={(e) => save(row, { status: e.target.value })} className={cn("h-7 mx-1 rounded px-1.5 text-[12px] font-medium outline-none", STATUS.find((s) => s[0] === row.status)?.[2])}>
                      {STATUS.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
                    </select>
                  </td>
                  <td className={cell(2)}>
                    <select data-cell={`${r}-2`} defaultValue={row.ownerId ?? ""} onFocus={() => setActive({ r, c: 2 })} onKeyDown={(e) => onKey(e, r, 2, row)} onChange={(e) => save(row, { ownerId: e.target.value ? Number(e.target.value) : null })} className="h-9 w-full bg-transparent px-2 text-[13px] outline-none">
                      <option value="">—</option>
                      {people.map((p) => <option key={p.id} value={p.id}>{p.displayName}</option>)}
                    </select>
                  </td>
                  <td className={cell(3)}><input data-cell={`${r}-3`} type="date" defaultValue={row.startDate ?? ""} onFocus={() => setActive({ r, c: 3 })} onKeyDown={(e) => onKey(e, r, 3, row)} onBlur={(e) => e.target.value !== (row.startDate ?? "") && save(row, { startDate: e.target.value || null })} className={cn(input, "tnum")} /></td>
                  <td className={cell(4)}><input data-cell={`${r}-4`} type="date" defaultValue={row.endDate ?? ""} onFocus={() => setActive({ r, c: 4 })} onKeyDown={(e) => onKey(e, r, 4, row)} onBlur={(e) => e.target.value !== (row.endDate ?? "") && save(row, { endDate: e.target.value || null })} className={cn(input, "tnum")} /></td>
                  <td className={cell(5)}>
                    <div className="flex items-center gap-2 px-2">
                      <input data-cell={`${r}-5`} type="number" min={0} max={100} defaultValue={row.percent} onFocus={() => setActive({ r, c: 5 })} onKeyDown={(e) => onKey(e, r, 5, row)} onBlur={(e) => Number(e.target.value) !== row.percent && save(row, { percent: Math.max(0, Math.min(100, Number(e.target.value))) })} className="tnum h-9 w-12 bg-transparent text-[13px] outline-none" />
                      <span className="bar flex-1"><i style={{ width: `${row.percent}%`, background: row.percent === 100 ? "var(--ok)" : undefined }} /></span>
                    </div>
                  </td>
                  <td className={cell(6)}>
                    <select data-cell={`${r}-6`} defaultValue={row.priority} onFocus={() => setActive({ r, c: 6 })} onKeyDown={(e) => onKey(e, r, 6, row)} onChange={(e) => save(row, { priority: e.target.value })} className={cn("h-9 w-full bg-transparent px-2 text-[13px] outline-none", row.priority === "high" && "text-warn", row.priority === "low" && "text-ink-3")}>
                      {["low", "medium", "high"].map((v) => <option key={v} value={v}>{v[0]!.toUpperCase() + v.slice(1)}</option>)}
                    </select>
                  </td>
                  <td className={cell(7)}>
                    <input data-cell={`${r}-7`} defaultValue={row.notes ?? ""} onFocus={() => setActive({ r, c: 7 })} onKeyDown={(e) => onKey(e, r, 7, row)} onBlur={(e) => e.target.value !== (row.notes ?? "") && save(row, { notes: e.target.value || null })} className={cn(input, "text-ink-2")} />
                  </td>
                  <td className="h-9 hairline-t">
                    <span className="flex items-center justify-end gap-0.5 pr-1 opacity-0 group-hover:opacity-100">
                      {row.ticketId && <Link href={`/tickets/${row.ticketId}`} className="rounded px-1 text-[11px] text-accent-ink hover:underline">TF</Link>}
                      <button title={child ? "Outdent" : "Indent under previous row"} onClick={() => start(() => indentProjectRow(row.id, child ? "out" : "in"))} className="rounded p-1 text-ink-3 hover:bg-surface-2 hover:text-ink"><CornerDownRight className={cn("size-3.5", child && "rotate-180")} /></button>
                      <button title="Insert row below" onClick={() => start(() => addProjectRow(projectId, row.id))} className="rounded p-1 text-ink-3 hover:bg-surface-2 hover:text-ink"><Plus className="size-3.5" /></button>
                      <button title="Delete row" onClick={() => start(() => deleteProjectRow(row.id))} className="rounded p-1 text-ink-3 hover:bg-crit-soft hover:text-crit"><Trash2 className="size-3.5" /></button>
                    </span>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      <p className="mt-2 text-[11.5px] text-ink-4">Every cell change is saved immediately and written to the activity log. Marking Done sets 100%; 100% marks Done.</p>
    </div>
  );
}
