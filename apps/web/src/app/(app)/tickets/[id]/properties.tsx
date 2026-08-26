"use client";

import { useTransition } from "react";
import { nextStatuses, type TicketStatus } from "@ticketfly/core";
import { updateTicket } from "@/app/actions";
import { PRIORITY_LABEL, STATUS_LABEL } from "@/lib/utils";
import { Select } from "@/components/ui/input";
import { SavedLine, useSavedAt } from "./saved-at";

type Opt = { id: number; displayName?: string; name?: string; jobTitle?: string | null };

export function Properties({ ticket, agents, groups, categories, department }: { department: string | null; ticket: { id: number; status: TicketStatus; priority: string; assigneeId: number | null; groupId: number | null; categoryId: number | null }; agents: Opt[]; groups: Opt[]; categories: Opt[] }) {
  const [pending, start] = useTransition();
  const { markSaved } = useSavedAt();
  const statuses = [ticket.status, ...nextStatuses(ticket.status)];
  const set = (patch: Parameters<typeof updateTicket>[1]) =>
    start(async () => {
      await updateTicket(ticket.id, patch);
      markSaved();
    });
  return (
    <section className="space-y-3 px-5 py-4" aria-busy={pending}>
      <div className="flex items-baseline justify-between">
        <p className="label">Properties</p>
        <SavedLine />
      </div>
      <Prop label="Workspace">
        <span className="flex h-8 items-center gap-2 rounded-md bg-surface-2 px-2.5 text-[13px]"><span className="size-2 rounded-sm bg-ok" /> IT Division</span>
      </Prop>
      <Prop label="Status">
        <Select value={ticket.status} onChange={(e) => set({ status: e.target.value as TicketStatus })} className="h-8 text-[13px]">
          {statuses.map((s) => (
            <option key={s} value={s}>
              {STATUS_LABEL[s]}
            </option>
          ))}
        </Select>
      </Prop>
      <Prop label="Priority">
        <Select value={ticket.priority} onChange={(e) => set({ priority: e.target.value as "low" | "medium" | "high" | "urgent" })} className="h-8 text-[13px]">
          {(["low", "medium", "high", "urgent"] as const).map((p) => (
            <option key={p} value={p}>
              {PRIORITY_LABEL[p]}
            </option>
          ))}
        </Select>
      </Prop>
      <Prop label="Assigned to">
        <Select value={ticket.assigneeId ?? ""} onChange={(e) => set({ assigneeId: e.target.value ? Number(e.target.value) : null })} className="h-8 text-[13px]">
          <option value="">Unassigned</option>
          {agents.map((a) => (
            <option key={a.id} value={a.id}>
              {a.displayName}
            </option>
          ))}
        </Select>
      </Prop>
      <Prop label="Department">
        <span className="flex h-8 items-center rounded-md bg-surface-2 px-2.5 text-[13px] text-ink-2">{department ?? "—"}</span>
      </Prop>
      <Prop label="Group">
        <Select value={ticket.groupId ?? ""} onChange={(e) => set({ groupId: e.target.value ? Number(e.target.value) : null })} className="h-8 text-[13px]">
          <option value="">—</option>
          {groups.map((g) => (
            <option key={g.id} value={g.id}>
              {g.name}
            </option>
          ))}
        </Select>
      </Prop>
      <Prop label="Category">
        <Select value={ticket.categoryId ?? ""} onChange={(e) => set({ categoryId: e.target.value ? Number(e.target.value) : null })} className="h-8 text-[13px]">
          <option value="">—</option>
          {categories.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </Select>
      </Prop>
    </section>
  );
}

function Prop({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="grid grid-cols-[76px_minmax(0,1fr)] items-center gap-2">
      <span className="text-[12.5px] text-ink-3">{label}</span>
      {children}
    </div>
  );
}
