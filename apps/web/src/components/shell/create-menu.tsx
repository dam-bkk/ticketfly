"use client";

import * as DropdownMenu from "@radix-ui/react-dropdown-menu";
import { BookOpen, ChevronDown, GitBranch, Laptop, Plus, Ticket, UserMinus, UserPlus } from "lucide-react";
import { useRouter } from "next/navigation";

const ITEMS: [string, string, React.ReactNode][] = [
  ["Ticket", "/portal/new/report-issue", <Ticket key="t" className="size-4" />],
  ["Asset", "/assets/inventory/new", <Laptop key="a" className="size-4" />],
  ["New starter", "/portal/new/new-starter", <UserPlus key="n" className="size-4" />],
  ["Leaver", "/portal/new/leaver", <UserMinus key="l" className="size-4" />],
  ["Change", "/changes/new", <GitBranch key="c" className="size-4" />],
  ["Solution article", "/solutions/new", <BookOpen key="s" className="size-4" />],
];

export function CreateMenu() {
  const router = useRouter();
  return (
    <DropdownMenu.Root>
      <DropdownMenu.Trigger asChild>
        <button className="inline-flex h-8 items-center gap-1.5 rounded-md bg-accent px-3 text-[13px] font-medium text-on-accent shadow-[0_1px_0_rgba(0,0,0,0.08),inset_0_1px_0_rgba(255,255,255,0.15)] hover:bg-accent-hover">
          <Plus className="size-3.5" /> Create <ChevronDown className="size-3.5 opacity-70" />
        </button>
      </DropdownMenu.Trigger>
      <DropdownMenu.Portal>
        <DropdownMenu.Content align="end" sideOffset={6} className="z-50 min-w-48 rounded-lg bg-surface p-1 shadow-3 hairline">
          {ITEMS.map(([label, href, icon]) => (
            <DropdownMenu.Item key={label} onSelect={() => router.push(href)} className="flex h-8 cursor-pointer select-none items-center gap-2.5 rounded-md px-2 text-[13px] text-ink-2 outline-none data-[highlighted]:bg-surface-2 data-[highlighted]:text-ink">
              <span className="text-ink-3">{icon}</span>
              {label}
            </DropdownMenu.Item>
          ))}
        </DropdownMenu.Content>
      </DropdownMenu.Portal>
    </DropdownMenu.Root>
  );
}
