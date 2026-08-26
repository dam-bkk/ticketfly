"use client";

import * as DropdownMenu from "@radix-ui/react-dropdown-menu";
import { Banknote, Check, ChevronDown, Globe, Kanban, Monitor, Shield } from "lucide-react";
import { useState } from "react";

const WORKSPACES = [
  { slug: "it", name: "IT Division", icon: <Monitor className="size-3.5" />, primary: true },
  { slug: "finance", name: "Finance", icon: <Banknote className="size-3.5" /> },
  { slug: "pwr", name: "Project Work Request", icon: <Kanban className="size-3.5" /> },
  { slug: "globalops", name: "Global Operation", icon: <Globe className="size-3.5" /> },
  { slug: "sip", name: "Strategic Initiatives Portal", icon: <Shield className="size-3.5" /> },
];

export function WorkspaceSwitcher() {
  const [current, setCurrent] = useState(WORKSPACES[0]!);
  return (
    <DropdownMenu.Root>
      <DropdownMenu.Trigger asChild>
        <button className="flex h-8 items-center gap-2 rounded-md px-2 text-[13px] font-medium text-ink hover:bg-surface-2">
          <span className="flex size-5 items-center justify-center rounded bg-accent-soft text-accent-ink">{current.icon}</span>
          {current.name}
          <ChevronDown className="size-3.5 text-ink-4" />
        </button>
      </DropdownMenu.Trigger>
      <DropdownMenu.Portal>
        <DropdownMenu.Content align="start" sideOffset={6} className="z-50 min-w-64 rounded-lg bg-surface p-1 shadow-3 hairline">
          <p className="label px-2 pb-1 pt-1.5">Workspaces</p>
          {WORKSPACES.map((w) => (
            <DropdownMenu.Item key={w.slug} onSelect={() => setCurrent(w)} className="flex h-8 cursor-pointer select-none items-center gap-2.5 rounded-md px-2 text-[13px] text-ink-2 outline-none data-[highlighted]:bg-surface-2 data-[highlighted]:text-ink">
              <span className="text-ink-3">{w.icon}</span>
              <span className="flex-1">{w.name}</span>
              {w.primary && <span className="rounded bg-warn-soft px-1.5 text-[10.5px] font-medium text-warn">Primary</span>}
              {w.slug === current.slug && <Check className="size-3.5 text-accent-ink" />}
            </DropdownMenu.Item>
          ))}
        </DropdownMenu.Content>
      </DropdownMenu.Portal>
    </DropdownMenu.Root>
  );
}
