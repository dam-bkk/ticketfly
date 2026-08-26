"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

const GROUPS: { title: string; items: [string, string][] }[] = [
  { title: "Workspace", items: [["/settings", "General"], ["/settings/sla", "Service levels"], ["/settings/roles", "Roles & permissions"], ["/settings/integrations", "Integrations"]] },
  { title: "Operations", items: [["/settings/activity", "Activity log"], ["/settings/releases", "Releases"], ["/settings/status", "System status"]] },
];

export function SettingsNav() {
  const path = usePathname();
  return (
    <nav className="w-[208px] shrink-0 space-y-5 bg-surface px-3 py-5 hairline-r">
      {GROUPS.map((g) => (
        <div key={g.title}>
          <p className="label mb-1.5 px-2">{g.title}</p>
          {g.items.map(([href, label]) => (
            <Link key={href} href={href} className={cn("block h-8 rounded-md px-2 text-[13px] leading-8 text-ink-2 hover:bg-surface-2 hover:text-ink", path === href && "bg-accent-soft font-medium text-accent-ink hover:bg-accent-soft hover:text-accent-ink")}>
              {label}
            </Link>
          ))}
        </div>
      ))}
    </nav>
  );
}
