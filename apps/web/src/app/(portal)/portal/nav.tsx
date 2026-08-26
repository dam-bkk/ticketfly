"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

export function PortalNav() {
  const path = usePathname();
  const items: [string, string][] = [
    ["/portal", "Home"],
    ["/portal/requests", "My requests"],
    ["/portal/devices", "My devices"],
    ["/portal/help", "Guides"],
  ];
  return (
    <nav className="flex items-center gap-1">
      {items.map(([href, label]) => (
        <Link key={href} href={href} className={cn("h-8 rounded-md px-3 text-[13px] font-medium leading-8 text-ink-2 transition-colors hover:bg-surface-2 hover:text-ink", (path === href || (href !== "/portal" && path.startsWith(href))) && "bg-surface-2 text-ink")}>
          {label}
        </Link>
      ))}
    </nav>
  );
}
