"use client";

import * as DropdownMenu from "@radix-ui/react-dropdown-menu";
import { Eye, EyeOff, Search } from "lucide-react";
import { useMemo, useState, useTransition } from "react";
import { setViewAs } from "@/app/actions";
import { Avatar } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";

type P = { id: number; displayName: string; role: string; jobTitle: string | null; department: string | null };
const ROLE_LABEL: Record<string, string> = { admin: "Admin", agent: "Agent", hr: "HR", manager: "Manager", requester: "Requester" };
const ORDER = ["requester", "manager", "agent", "hr", "admin"];

/** "View as" (PolyQi pattern): admins render the app from any seat. One per role up top, then search everyone. */
export function ViewAs({ people, viewing, compact }: { people: P[]; viewing: { id: number; displayName: string; role: string } | null; compact?: boolean }) {
  const [q, setQ] = useState("");
  const [pending, start] = useTransition();
  const quick = useMemo(() => ORDER.map((r) => people.find((p) => p.role === r)).filter((p): p is P => !!p), [people]);
  const matches = useMemo(() => {
    const t = q.trim().toLowerCase();
    if (!t) return [];
    return people.filter((p) => `${p.displayName} ${p.jobTitle} ${p.department} ${p.role}`.toLowerCase().includes(t)).slice(0, 8);
  }, [q, people]);
  return (
    <DropdownMenu.Root>
      <DropdownMenu.Trigger asChild>
        <button className={cn("inline-flex h-8 items-center gap-1.5 rounded-md px-2.5 text-[12.5px] font-medium hairline hover:bg-surface-2", viewing ? "bg-warn-soft text-warn hover:bg-warn-soft" : "text-ink-2")} aria-busy={pending}>
          <Eye className="size-3.5" /> {viewing ? (compact ? viewing.displayName.split(" ")[0] : `Viewing as ${viewing.displayName}`) : "View as"}
        </button>
      </DropdownMenu.Trigger>
      <DropdownMenu.Portal>
        <DropdownMenu.Content align="end" sideOffset={6} className="z-50 w-80 rounded-lg bg-surface p-1 shadow-3 hairline" onCloseAutoFocus={(e) => e.preventDefault()}>
          <p className="label px-2 pb-1 pt-1.5">One of each role</p>
          {quick.map((p) => (
            <DropdownMenu.Item key={p.id} onSelect={() => start(() => setViewAs(p.id))} className="flex h-9 cursor-pointer select-none items-center gap-2.5 rounded-md px-2 text-[13px] outline-none data-[highlighted]:bg-surface-2">
              <Avatar name={p.displayName} size={22} />
              <span className="min-w-0 flex-1 truncate">{p.displayName} <span className="text-ink-3">· {p.jobTitle}</span></span>
              <span className="rounded bg-surface-2 px-1.5 text-[10.5px] font-medium text-ink-2">{ROLE_LABEL[p.role]}</span>
            </DropdownMenu.Item>
          ))}
          <div className="mt-1 px-1 pt-1 hairline-t">
            <label className="flex h-8 items-center gap-2 rounded-md bg-surface-2 px-2 text-[12.5px]">
              <Search className="size-3.5 text-ink-3" />
              <input value={q} onChange={(e) => setQ(e.target.value)} onKeyDown={(e) => e.stopPropagation()} placeholder="Anyone by name, role, department" className="flex-1 bg-transparent outline-none" />
            </label>
            {matches.map((p) => (
              <DropdownMenu.Item key={p.id} onSelect={() => start(() => setViewAs(p.id))} className="mt-0.5 flex h-8 cursor-pointer select-none items-center gap-2 rounded-md px-2 text-[12.5px] outline-none data-[highlighted]:bg-surface-2">
                <Avatar name={p.displayName} size={18} />
                <span className="min-w-0 flex-1 truncate">{p.displayName} <span className="text-ink-3">· {p.department}</span></span>
                <span className="text-[10.5px] text-ink-3">{ROLE_LABEL[p.role]}</span>
              </DropdownMenu.Item>
            ))}
          </div>
          {viewing && (
            <DropdownMenu.Item onSelect={() => start(() => setViewAs(null))} className="mt-1 flex h-9 cursor-pointer select-none items-center gap-2 rounded-md px-2 text-[13px] font-medium text-warn outline-none hairline-t data-[highlighted]:bg-warn-soft">
              <EyeOff className="size-3.5" /> Exit — back to my own view
            </DropdownMenu.Item>
          )}
          <p className="px-2 pb-1 pt-1.5 text-[11px] text-ink-4">Pages follow the viewed person's role and workspaces. The activity log keeps you as the actor.</p>
        </DropdownMenu.Content>
      </DropdownMenu.Portal>
    </DropdownMenu.Root>
  );
}

export function ViewAsBanner({ viewing }: { viewing: { displayName: string; role: string } }) {
  const [pending, start] = useTransition();
  return (
    <div className="flex h-8 shrink-0 items-center justify-center gap-3 bg-warn-soft px-4 text-[12.5px] text-warn">
      <Eye className="size-3.5" />
      Viewing as <strong className="font-medium">{viewing.displayName}</strong> ({ROLE_LABEL[viewing.role]}) — what they would see and could do.
      <button onClick={() => start(() => setViewAs(null))} disabled={pending} className="rounded-md bg-surface px-2 py-0.5 font-medium text-ink hairline hover:bg-surface-2">Exit</button>
    </div>
  );
}
