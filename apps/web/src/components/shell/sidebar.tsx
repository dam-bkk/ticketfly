"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { Activity, AlertTriangle, BarChart3, BookOpen, Boxes, ChevronDown, ClipboardList, FolderKanban, Gauge, GitBranch, Kanban, LayoutList, Repeat, Route, Settings, ShieldCheck, SlidersHorizontal, Ticket, Users } from "lucide-react";
import { cn } from "@/lib/utils";
import { QiMark } from "@/components/ui/logo";
import { Avatar } from "@/components/ui/avatar";
import { PersonaMenu } from "./persona-menu";

type Leaf = { href: string; label: string; icon?: React.ReactNode; badge?: number; tone?: "warn" };
type Group = { label: string; icon: React.ReactNode; children: Leaf[]; defaultOpen?: boolean };
type Item = Leaf | Group;

const isGroup = (i: Item): i is Group => "children" in i;

/** Responsive contract: full 220px rail at ≥1200px; below that an icon-only 48px rail (labels via `title`, badges kept). */

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
    <aside className={cn("flex h-full w-12 shrink-0 flex-col bg-surface hairline-r", "min-[1200px]:w-[220px]")}>
      <div className={cn("flex h-12 items-center justify-center", "min-[1200px]:justify-start min-[1200px]:px-4")}>
        <Link href="/dashboard" title="Service Desk" className="inline-flex items-center gap-2 rounded-md leading-none">
          <QiMark size={20} />
          <span className={cn("hidden text-[13.5px] font-medium tracking-[-0.01em] text-ink", "min-[1200px]:inline")}>Service Desk</span>
        </Link>
      </div>
      <nav className={cn("flex-1 overflow-y-auto px-1 pb-2 pt-1", "min-[1200px]:px-2")}>
        <ul className="space-y-px">
          {items.map((it) => (
            <li key={isGroup(it) ? it.label : it.href}>{isGroup(it) ? <GroupRow g={it} path={path} /> : <LeafRow l={it} path={path} top />}</li>
          ))}
        </ul>
        <div className={cn("mt-3 pt-3 hairline-t", "min-[1200px]:px-2")}>
          <Link href="/admin/sidebar" title="Customize sidebar" className={cn("flex h-8 items-center justify-center gap-2.5 rounded-md text-[12.5px] text-ink-3 hover:bg-surface-2 hover:text-ink", "min-[1200px]:justify-start min-[1200px]:px-2")}>
            <SlidersHorizontal className="size-3.5" /> <span className={cn("hidden", "min-[1200px]:inline")}>Customize sidebar</span>
          </Link>
        </div>
      </nav>
      {/* pb-12 reserves the bottom-left zone that dev overlays (Next indicator, View-as bar) sit over. */}
      <div className="p-2 pb-12 hairline-t">
        <PersonaMenu me={me}>
          <button title={`${me.displayName} · ${me.jobTitle ?? me.role}`} className={cn("flex w-full items-center justify-center gap-2.5 rounded-md px-1 py-2 text-left transition-colors hover:bg-surface-2", "min-[1200px]:justify-start min-[1200px]:px-2")}>
            <Avatar name={me.displayName} size={26} />
            <span className={cn("hidden min-w-0 flex-1", "min-[1200px]:block")}>
              <span className="block truncate text-[12.5px] font-medium">{me.displayName}</span>
              <span className="block truncate text-[11px] text-ink-3">{me.jobTitle ?? me.role}</span>
            </span>
          </button>
        </PersonaMenu>
        <p className={cn("mt-1 hidden items-center gap-1.5 px-2 font-mono text-[11px] text-ink-3", "min-[1200px]:flex")}>
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

function Badge({ n, tone, on, collapsed }: { n?: number; tone?: "warn"; on?: boolean; collapsed?: boolean }) {
  if (!n) return null;
  const tint = tone === "warn" ? "bg-warn-soft text-warn" : on ? "bg-surface text-accent-ink" : "bg-surface-2 text-ink-3";
  return collapsed ? (
    <span className={cn("tnum absolute -right-0.5 -top-0.5 rounded px-1 text-[11px] font-medium leading-4", tint, "min-[1200px]:hidden")}>{n}</span>
  ) : (
    <span className={cn("tnum hidden rounded px-1.5 text-[11px] font-medium", tint, "min-[1200px]:inline")}>{n}</span>
  );
}

function LeafRow({ l, path, top }: { l: Leaf; path: string; top?: boolean }) {
  const on = active(path, l.href);
  const base = "group relative flex h-8 items-center gap-2.5 rounded-md text-[13.5px] text-ink-2 transition-colors hover:bg-surface-2 hover:text-ink";
  const onCls = on && "bg-accent-soft text-accent-ink hover:bg-accent-soft hover:text-accent-ink";
  if (!top) {
    // Sub-items only exist in the wide rail; the collapsed rail shows their parent group as one icon.
    return (
      <Link href={l.href} title={l.label} className={cn(base, "hidden pl-8 pr-2", "min-[1200px]:flex", onCls)}>
        {l.icon && <span className={cn("-ml-5 mr-0.5 text-ink-3", on && "text-accent-ink")}>{l.icon}</span>}
        <span className="flex-1 truncate">{l.label}</span>
        <Badge n={l.badge} tone={l.tone} on={on} />
      </Link>
    );
  }
  return (
    <Link href={l.href} title={l.label} className={cn(base, "justify-center font-medium", "min-[1200px]:justify-start min-[1200px]:px-2", onCls)}>
      <span className={cn("text-ink-3 group-hover:text-ink", on && "text-accent-ink group-hover:text-accent-ink")}>{l.icon}</span>
      <span className={cn("hidden flex-1 truncate", "min-[1200px]:block")}>{l.label}</span>
      <Badge n={l.badge} tone={l.tone} on={on} />
      <Badge n={l.badge} tone={l.tone} on={on} collapsed />
    </Link>
  );
}

function GroupRow({ g, path }: { g: Group; path: string }) {
  const childActive = g.children.some((c) => active(path, c.href));
  const [open, setOpen] = useState(g.defaultOpen || childActive);
  const first = g.children[0]!;
  const badge = g.children.reduce((n, c) => n + (c.badge ?? 0), 0);
  const tone = g.children.find((c) => c.badge && c.tone === "warn") ? "warn" : undefined;
  return (
    <div>
      {/* Collapsed rail: the group is one icon linking to its first page, with the summed badge. */}
      <Link href={first.href} title={g.label} className={cn("group relative flex h-8 items-center justify-center rounded-md text-ink-2 transition-colors hover:bg-surface-2 hover:text-ink", "min-[1200px]:hidden", childActive && "bg-accent-soft text-accent-ink hover:bg-accent-soft hover:text-accent-ink")}>
        <span className={cn("text-ink-3 group-hover:text-ink", childActive && "text-accent-ink group-hover:text-accent-ink")}>{g.icon}</span>
        <Badge n={badge} tone={tone} on={childActive} collapsed />
      </Link>
      <button onClick={() => setOpen((o) => !o)} className={cn("group hidden h-8 w-full items-center gap-2.5 rounded-md px-2 text-[13.5px] font-medium text-ink-2 transition-colors hover:bg-surface-2 hover:text-ink", "min-[1200px]:flex", childActive && !open && "text-ink")}>
        <span className="text-ink-3 group-hover:text-ink">{g.icon}</span>
        <span className="flex-1 truncate text-left">{g.label}</span>
        {!open && <Badge n={badge} tone={tone} />}
        <ChevronDown className={cn("size-3.5 text-ink-3 transition-transform", open && "rotate-180")} />
      </button>
      {open && (
        <ul className={cn("mt-px hidden space-y-px", "min-[1200px]:block")}>
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
