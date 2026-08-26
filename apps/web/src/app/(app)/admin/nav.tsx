"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Banknote, Globe, Kanban, Monitor, Settings2, Shield } from "lucide-react";
import { cn } from "@/lib/utils";

const WORKSPACES: [string, React.ReactNode, boolean][] = [
  ["IT Division", <Monitor key="1" className="size-4" />, true],
  ["Finance", <Banknote key="2" className="size-4" />, false],
  ["Project Work Request", <Kanban key="3" className="size-4" />, false],
  ["Global Operation", <Globe key="4" className="size-4" />, false],
  ["Strategic Initiatives Portal", <Shield key="5" className="size-4" />, false],
];

const PAGES: [string, string][] = [["/admin", "Admin home"], ["/admin/general", "Service desk settings"], ["/admin/sla", "SLA and OLA policies"], ["/admin/roles", "Roles"], ["/admin/integrations", "Integrations"], ["/admin/activity", "Activity log"], ["/admin/releases", "Releases"], ["/admin/status", "System status"]];

/** Freshservice's admin left pane: Global Settings on top, workspaces below. Workspace isolation is a later phase; the pane is here so the muscle memory is. */
export function SettingsNav() {
  const path = usePathname();
  return (
    <nav className="w-[248px] shrink-0 overflow-y-auto bg-surface px-3 py-4 hairline-r">
      <Link href="/admin" className={cn("flex items-start gap-3 rounded-lg px-3 py-3 hairline", path === "/admin" ? "bg-accent-soft" : "hover:bg-surface-2")}>
        <span className="flex size-8 items-center justify-center rounded-md bg-surface text-ink-2 hairline">
          <Settings2 className="size-4" />
        </span>
        <span>
          <span className="block text-[13px] font-medium">Global Settings</span>
          <span className="block text-[11.5px] leading-snug text-ink-3">Manage users and settings that apply across workspaces</span>
        </span>
      </Link>
      <p className="label mb-2 mt-5 px-1">Workspace Settings</p>
      <ul className="space-y-1.5">
        {WORKSPACES.map(([name, icon, primary]) => (
          <li key={name} className="flex items-center gap-2.5 rounded-lg px-3 py-2 text-[13px] hairline">
            <span className="text-ink-3">{icon}</span>
            <span className="flex-1 truncate">{name}</span>
            {primary && <span className="rounded bg-warn-soft px-1.5 text-[10.5px] font-medium text-warn">Primary</span>}
          </li>
        ))}
      </ul>
      <p className="mt-2 px-1 text-[11px] text-ink-4">Per-workspace isolation: Phase 3</p>
      <p className="label mb-1.5 mt-5 px-1">Pages</p>
      {PAGES.map(([href, label]) => (
        <Link key={href} href={href} className={cn("block h-8 rounded-md px-2 text-[13px] leading-8 text-ink-2 hover:bg-surface-2 hover:text-ink", path === href && "bg-accent-soft font-medium text-accent-ink hover:bg-accent-soft hover:text-accent-ink")}>
          {label}
        </Link>
      ))}
    </nav>
  );
}
