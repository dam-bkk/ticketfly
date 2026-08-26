"use client";

import * as DropdownMenu from "@radix-ui/react-dropdown-menu";
import { Banknote, Check, ChevronDown, Globe, Kanban, Monitor, Shield } from "lucide-react";
import { useTransition } from "react";
import { switchWorkspace } from "@/app/extra-actions";

const ICONS: Record<string, React.ReactNode> = { monitor: <Monitor className="size-3.5" />, banknote: <Banknote className="size-3.5" />, kanban: <Kanban className="size-3.5" />, globe: <Globe className="size-3.5" />, shield: <Shield className="size-3.5" /> };
type W = { slug: string; name: string; primary: boolean; icon: string };

export function WorkspaceSwitcher({ current, allowed }: { current: W; allowed: W[] }) {
  const [pending, start] = useTransition();
  return (
    <DropdownMenu.Root>
      <DropdownMenu.Trigger asChild>
        <button className="flex h-8 items-center gap-2 rounded-md px-2 text-[13px] font-medium text-ink hover:bg-surface-2" aria-busy={pending}>
          <span className="flex size-5 items-center justify-center rounded bg-accent-soft text-accent-ink">{ICONS[current.icon] ?? ICONS.monitor}</span>
          {current.name}
          <ChevronDown className="size-3.5 text-ink-3" />
        </button>
      </DropdownMenu.Trigger>
      <DropdownMenu.Portal>
        <DropdownMenu.Content align="start" sideOffset={6} className="z-50 min-w-64 rounded-lg bg-surface p-1 shadow-3 hairline">
          <p className="label px-2 pb-1 pt-1.5">Your workspaces</p>
          {allowed.map((w) => (
            <DropdownMenu.Item key={w.slug} onSelect={() => start(() => switchWorkspace(w.slug))} className="flex h-8 cursor-pointer select-none items-center gap-2.5 rounded-md px-2 text-[13px] text-ink-2 outline-none data-[highlighted]:bg-surface-2 data-[highlighted]:text-ink">
              <span className="text-ink-3">{ICONS[w.icon] ?? ICONS.monitor}</span>
              <span className="flex-1">{w.name}</span>
              {w.primary && <span className="rounded bg-warn-soft px-1.5 text-[10.5px] font-medium text-warn">Primary</span>}
              {w.slug === current.slug && <Check className="size-3.5 text-accent-ink" />}
            </DropdownMenu.Item>
          ))}
          <p className="px-2 pb-1 pt-1.5 text-[11px] text-ink-3">Tickets, assets and projects are filtered to the workspace you are in.</p>
        </DropdownMenu.Content>
      </DropdownMenu.Portal>
    </DropdownMenu.Root>
  );
}
