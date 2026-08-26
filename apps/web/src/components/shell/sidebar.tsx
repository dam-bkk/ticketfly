"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { BarChart3, Inbox, Laptop, Settings, UserPlus, Users } from "lucide-react";
import { cn } from "@/lib/utils";
import { Logo } from "@/components/ui/logo";
import { Avatar } from "@/components/ui/avatar";
import { PersonaMenu } from "./persona-menu";

type Item = { href: string; label: string; icon: React.ReactNode; badge?: number; tone?: "default" | "warn" };

export function Sidebar({ me, counts, version }: { me: { displayName: string; jobTitle: string | null; role: string }; counts: { open: number; mine: number; atRisk: number; onboarding: number }; version: string }) {
  const path = usePathname();
  const items: Item[] = [
    { href: "/inbox", label: "Inbox", icon: <Inbox className="size-4" />, badge: counts.open },
    { href: "/dashboard", label: "Dashboard", icon: <BarChart3 className="size-4" /> },
    { href: "/assets", label: "Assets", icon: <Laptop className="size-4" /> },
    { href: "/people", label: "People", icon: <Users className="size-4" /> },
    { href: "/onboarding", label: "Joiners & leavers", icon: <UserPlus className="size-4" />, badge: counts.onboarding, tone: "warn" },
    { href: "/settings", label: "Settings", icon: <Settings className="size-4" /> },
  ];
  return (
    <aside className="flex h-full w-[232px] shrink-0 flex-col bg-surface hairline-r">
      <div className="flex h-14 items-center px-4">
        <Link href="/inbox" className="rounded-md">
          <Logo />
        </Link>
      </div>
      <nav className="flex-1 space-y-0.5 px-2 pt-1">
        {items.map((it) => {
          const active = path === it.href || path.startsWith(it.href + "/") || (it.href === "/inbox" && path.startsWith("/tickets"));
          return (
            <Link
              key={it.href}
              href={it.href}
              className={cn(
                "group flex h-8 items-center gap-2.5 rounded-md px-2 text-[13px] font-medium text-ink-2 transition-colors hover:bg-surface-2 hover:text-ink",
                active && "bg-accent-soft text-accent-ink hover:bg-accent-soft hover:text-accent-ink",
              )}
            >
              <span className={cn("text-ink-3 group-hover:text-ink", active && "text-accent-ink group-hover:text-accent-ink")}>{it.icon}</span>
              <span className="flex-1">{it.label}</span>
              {it.badge ? <span className={cn("tnum rounded px-1.5 text-[11px] font-medium", it.tone === "warn" ? "bg-warn-soft text-warn" : "bg-surface-2 text-ink-3", active && it.tone !== "warn" && "bg-surface text-accent-ink")}>{it.badge}</span> : null}
            </Link>
          );
        })}
        <div className="px-2 pt-5 pb-1.5">
          <p className="label">Views</p>
        </div>
        {[
          ["/inbox?f=mine", "Assigned to me", counts.mine],
          ["/inbox?f=unassigned", "Unassigned"],
          ["/inbox?f=at_risk", "SLA at risk", counts.atRisk],
          ["/inbox?f=legacy", "Freshservice archive"],
        ].map(([href, label, n]) => (
          <Link key={href as string} href={href as string} className="flex h-7 items-center gap-2 rounded-md px-2 text-[12.5px] text-ink-2 hover:bg-surface-2 hover:text-ink">
            <span className="size-1.5 rounded-full bg-ink-4" />
            <span className="flex-1">{label}</span>
            {n ? <span className="tnum text-[11px] text-ink-3">{n as number}</span> : null}
          </Link>
        ))}
      </nav>
      <div className="p-2 hairline-t">
        <PersonaMenu me={me}>
          <button className="flex w-full items-center gap-2.5 rounded-md px-2 py-2 text-left transition-colors hover:bg-surface-2">
            <Avatar name={me.displayName} size={28} />
            <span className="min-w-0 flex-1">
              <span className="block truncate text-[13px] font-medium">{me.displayName}</span>
              <span className="block truncate text-[11.5px] text-ink-3">{me.jobTitle ?? me.role}</span>
            </span>
          </button>
        </PersonaMenu>
        <p className="mt-1 px-2 font-mono text-[10.5px] text-ink-4">v{version} · dev</p>
      </div>
    </aside>
  );
}
