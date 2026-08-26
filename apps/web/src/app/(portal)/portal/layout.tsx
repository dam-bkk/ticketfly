import Link from "next/link";
import { requirePrincipal } from "@/lib/auth";
import { Logo } from "@/components/ui/logo";
import { Avatar } from "@/components/ui/avatar";
import { PersonaMenu } from "@/components/shell/persona-menu";
import { CommandPalette } from "@/components/shell/command-palette";
import { PortalNav } from "./nav";
import { viewAsContext } from "@/lib/view-as";
import { ViewAsBar } from "@/components/shell/view-as";

export default async function PortalLayout({ children }: { children: React.ReactNode }) {
  const me = await requirePrincipal();
  const staff = me.role === "agent" || me.role === "admin" || me.role === "hr";
  const va = await viewAsContext(me);
  return (
    <div className="min-h-dvh bg-canvas">
      <header className="sticky top-0 z-40 bg-canvas/80 backdrop-blur-md">
        <div className="mx-auto flex h-16 max-w-[1080px] items-center gap-6 px-6">
          <Link href="/portal" className="flex h-8 items-center rounded-md">
            <Logo />
          </Link>
          <PortalNav />
          <div className="ml-auto flex items-center gap-3">
            <CommandPalette portal />
            {staff && (
              <Link href="/tickets" className="text-[12.5px] font-medium text-ink-3 hover:text-ink">
                Back to IT workspace
              </Link>
            )}
            <PersonaMenu me={me} align="end">
              <button className="flex items-center gap-2 rounded-full p-0.5 hover:bg-surface-2">
                <Avatar name={me.displayName} size={30} />
              </button>
            </PersonaMenu>
          </div>
        </div>
      </header>
      <main className="mx-auto max-w-[1080px] px-6 pb-24">{children}</main>
      <footer className="mx-auto max-w-[1080px] px-6 pb-10 text-[12px] text-ink-4">
        IT QI Group · Service desk hours 09:00–18:00 HKT, Monday to Friday · Urgent security issues are handled 24 × 7
      </footer>
      {va && <ViewAsBar people={va.people} viewing={va.viewing} />}
    </div>
  );
}
