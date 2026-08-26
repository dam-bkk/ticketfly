import Link from "next/link";
import { Bell, ChevronRight } from "lucide-react";
import { CommandPalette } from "./command-palette";
import { CreateMenu } from "./create-menu";
import { WorkspaceSwitcher } from "./workspace-switcher";
import { cn } from "@/lib/utils";

export function Topbar({ crumbs, actions, className, workspace = true }: { crumbs: { label: string; href?: string }[]; actions?: React.ReactNode; className?: string; workspace?: boolean }) {
  return (
    <header className={cn("flex h-12 shrink-0 items-center gap-3 bg-surface px-4 hairline-b", className)}>
      {workspace && <WorkspaceSwitcher />}
      <nav className="flex min-w-0 items-center gap-1 text-[13px]">
        {crumbs.map((c, i) => (
          <span key={i} className="flex items-center gap-1">
            {i > 0 && <ChevronRight className="size-3.5 text-ink-4" />}
            {c.href ? (
              <Link href={c.href} className="rounded text-ink-2 hover:text-ink">
                {c.label}
              </Link>
            ) : (
              <span className="truncate font-medium text-ink">{c.label}</span>
            )}
          </span>
        ))}
      </nav>
      <div className="ml-auto flex items-center gap-2">
        <CommandPalette />
        <CreateMenu />
        <Link href="/notifications" aria-label="Notifications" className="relative inline-flex size-8 items-center justify-center rounded-md text-ink-3 hover:bg-surface-2 hover:text-ink">
          <Bell className="size-4" />
          <span className="absolute right-1.5 top-1.5 size-1.5 rounded-full bg-crit" />
        </Link>
        {actions}
      </div>
    </header>
  );
}
