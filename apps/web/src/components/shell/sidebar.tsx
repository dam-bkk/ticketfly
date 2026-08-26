"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { Activity, AlertTriangle, BarChart3, BookOpen, Boxes, ChevronDown, ClipboardList, FolderKanban, Gauge, GitBranch, Kanban, LayoutList, Repeat, Route, Settings, ShieldCheck, SlidersHorizontal, Ticket, Users } from "lucide-react";
import { cn } from "@/lib/utils";
import { Logo } from "@/components/ui/logo";
import { Avatar } from "@/components/ui/avatar";
import { PersonaMenu } from "./persona-menu";

type Leaf = { href: string; label: string; icon?: React.ReactNode; badge?: number; tone?: "warn" };
type Group = { label: string; icon: React.ReactNode; children: Leaf[]; defaultOpen?: boolean };
type Item = Leaf | Group;

const isGroup = (i: Item): i is Group => "children" in i;

export function Sidebar({ me, counts, version, hidden = [] }: { me: { displayName: string; jobTitle: string | null; role: string }; counts: { open: number; mine: number; atRisk: number; onboarding: number; approvals?: number; tasks?: number; alerts?: number }; version: string; hidden?: string[] }) {
  const path = usePathname();
  const all: [string, Item][] = [
    ["reporting", { label: "Reporting", icon: <BarChart3 className="size-4" />, children: [{ href: "/reporting", label: "Analytics" }, { href: "/reporting/sla", label: "SLA performance" }] }],
    ["dashboard", { href: "/dashboard", label: "Dashboard", icon: <Gauge className="size-4" /> }],
    ["tickets", { label: "Tickets", icon: <Ticket className="size-4" />, defaultOpen: true, children: [{ href: "/tickets", label: "List", icon: <LayoutList className="size-3.5" />, badge: counts.open }, { href: "/tickets/board", label: "Board", icon: <Kanban className="size-3.5" /> }] }],
    ["journeys", { label: "Journeys", icon: <Route className="size-4" />, defaultOpen: true, children: [{ href: "/journeys/onboarding", label: "Onboarding", badge: counts.onboarding, tone: "warn" }, { href: "/journeys/offboarding", label: "Offboarding" }] }],
    ["problems", { href: "/problems", label: "Problems", icon: <AlertTriangle className="size-4" /> }],
    ["changes", { href: "/changes", label: "Changes", icon: <GitBranch className="size-4" />, badge: counts.approvals, tone: "warn" }],
    ["releases", { href: "/releases", label: "Releases", icon: <Repeat className="size-4" /> }],
    ["tasks", { href: "/tasks", label: "Tasks", icon: <ClipboardList className="size-4" />, badge: counts.tasks }],
    ["it-ops", { label: "IT Operations", icon: <Activity className="size-4" />, children: [{ href: "/it-ops/alerts", label: "Alerts", badge: counts.alerts, tone: "warn" }, { href: "/it-ops/status", label: "Status page" }] }],
    ["assets", { label: "Assets", icon: <Boxes className="size-4" />, defaultOpen: true, children: [{ href: "/assets/inventory", label: "Inventory" }, { href: "/assets/software", label: "Software" }, { href: "/assets/contracts", label: "Contracts" }, { href: "/assets/purchase-orders", label: "Purchase Orders" }] }],
    ["projects", { label: "Projects", icon: <FolderKanban className="size-4" />, children: [{ href: "/projects", label: "All projects" }, { href: "/projects/new", label: "New project" }] }],
    ["people", { href: "/people", label: "People", icon: <Users className="size-4" /> }],
    ["solutions", { href: "/solutions", label: "Solutions", icon: <BookOpen className="size-4" /> }],
    ["admin", { href: "/admin", label: "Admin", icon: <Settings className="size-4" /> }],
  ];
  const items = all.filter(([key]) => !hidden.includes(key)).map(([, it]) => it);
  return (
    <aside className="flex h-full w-[220px] shrink-0 flex-col bg-surface hairline-r">
      <div className="flex h-12 items-center px-4">
        <Link href="/dashboard" className="rounded-md">
          <Logo size={20} />
        </Link>
      </div>
      <nav className="flex-1 overflow-y-auto px-2 pb-2 pt-1">
        <ul className="space-y-px">
          {items.map((it) => (
            <li key={isGroup(it) ? it.label : it.href}>{isGroup(it) ? <GroupRow g={it} path={path} /> : <LeafRow l={it} path={path} top />}</li>
          ))}
        </ul>
        <div className="mt-3 px-2 pt-3 hairline-t">
          <Link href="/admin/sidebar" className="flex h-8 items-center gap-2.5 rounded-md px-2 text-[12.5px] text-ink-3 hover:bg-surface-2 hover:text-ink">
            <SlidersHorizontal className="size-3.5" /> Customize sidebar
          </Link>
        </div>
      </nav>
      <div className="p-2 hairline-t">
        <PersonaMenu me={me}>
          <button className="flex w-full items-center gap-2.5 rounded-md px-2 py-1.5 text-left transition-colors hover:bg-surface-2">
            <Avatar name={me.displayName} size={26} />
            <span className="min-w-0 flex-1">
              <span className="block truncate text-[12.5px] font-medium">{me.displayName}</span>
              <span className="block truncate text-[11px] text-ink-3">{me.jobTitle ?? me.role}</span>
            </span>
          </button>
        </PersonaMenu>
        <p className="mt-1 flex items-center gap-1.5 px-2 font-mono text-[10.5px] text-ink-4">
          <ShieldCheck className="size-3" /> v{version} · dev
        </p>
      </div>
    </aside>
  );
}

function active(path: string, href: string) {
  if (href === "/tickets") return path === "/tickets" || path.startsWith("/tickets/") && !path.startsWith("/tickets/board");
  return path === href || path.startsWith(href + "/");
}

function LeafRow({ l, path, top }: { l: Leaf; path: string; top?: boolean }) {
  const on = active(path, l.href);
  return (
    <Link href={l.href} className={cn("group flex h-8 items-center gap-2.5 rounded-md text-[13px] text-ink-2 transition-colors hover:bg-surface-2 hover:text-ink", top ? "px-2 font-medium" : "pl-8 pr-2", on && "bg-accent-soft text-accent-ink hover:bg-accent-soft hover:text-accent-ink")}>
      {top && <span className={cn("text-ink-3 group-hover:text-ink", on && "text-accent-ink group-hover:text-accent-ink")}>{l.icon}</span>}
      {!top && l.icon && <span className={cn("-ml-5 mr-0.5 text-ink-4", on && "text-accent-ink")}>{l.icon}</span>}
      <span className="flex-1 truncate">{l.label}</span>
      {l.badge ? <span className={cn("tnum rounded px-1.5 text-[11px] font-medium", l.tone === "warn" ? "bg-warn-soft text-warn" : "bg-surface-2 text-ink-3", on && l.tone !== "warn" && "bg-surface text-accent-ink")}>{l.badge}</span> : null}
    </Link>
  );
}

function GroupRow({ g, path }: { g: Group; path: string }) {
  const childActive = g.children.some((c) => active(path, c.href));
  const [open, setOpen] = useState(g.defaultOpen || childActive);
  return (
    <div>
      <button onClick={() => setOpen((o) => !o)} className={cn("group flex h-8 w-full items-center gap-2.5 rounded-md px-2 text-[13px] font-medium text-ink-2 transition-colors hover:bg-surface-2 hover:text-ink", childActive && !open && "text-ink")}>
        <span className="text-ink-3 group-hover:text-ink">{g.icon}</span>
        <span className="flex-1 truncate text-left">{g.label}</span>
        <ChevronDown className={cn("size-3.5 text-ink-4 transition-transform", open && "rotate-180")} />
      </button>
      {open && (
        <ul className="mt-px space-y-px">
          {g.children.map((c) => (
            <li key={c.href}>
              <LeafRow l={c} path={path} />
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

