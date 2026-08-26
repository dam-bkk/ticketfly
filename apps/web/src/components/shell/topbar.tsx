import Link from "next/link";
import { ChevronRight } from "lucide-react";
import { CommandPalette } from "./command-palette";
import { cn } from "@/lib/utils";

export function Topbar({ crumbs, actions, className }: { crumbs: { label: string; href?: string }[]; actions?: React.ReactNode; className?: string }) {
  return (
    <header className={cn("flex h-14 shrink-0 items-center gap-3 bg-surface px-5 hairline-b", className)}>
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
        {actions}
      </div>
    </header>
  );
}
