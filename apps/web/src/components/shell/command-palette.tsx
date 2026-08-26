"use client";

import * as Dialog from "@radix-ui/react-dialog";
import { Command } from "cmdk";
import { BarChart3, Inbox, Laptop, Search, Settings, Ticket, UserPlus, Users } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { Kbd } from "@/components/ui/kbd";
import { StatusDot } from "@/components/ui/pills";

type Results = {
  tickets: { id: number; legacyRef: string | null; subject: string; status: string; requester: string | null }[];
  people: { id: number; displayName: string; jobTitle: string | null; department: string | null }[];
  assets: { id: number; name: string; assetTag: string; model: string | null }[];
};

export function CommandPalette({ portal }: { portal?: boolean }) {
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState("");
  const [res, setRes] = useState<Results | null>(null);
  const router = useRouter();

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setOpen((o) => !o);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  useEffect(() => {
    if (!open) return;
    const term = q.trim();
    if (term.length < 2) {
      setRes(null);
      return;
    }
    const ctl = new AbortController();
    const t = setTimeout(() => {
      fetch(`/api/search?q=${encodeURIComponent(term)}`, { signal: ctl.signal })
        .then((r) => r.json())
        .then(setRes)
        .catch(() => {});
    }, 120);
    return () => {
      clearTimeout(t);
      ctl.abort();
    };
  }, [q, open]);

  const go = (href: string) => {
    setOpen(false);
    setQ("");
    router.push(href);
  };

  return (
    <>
      <button onClick={() => setOpen(true)} className="flex h-8 w-64 items-center gap-2 rounded-md bg-surface-2 px-2.5 text-left text-[13px] text-ink-3 transition-colors hover:bg-surface-3">
        <Search className="size-3.5" />
        <span className="flex-1">{portal ? "Search your requests" : "Search tickets, people, assets"}</span>
        <Kbd>⌘K</Kbd>
      </button>
      <Dialog.Root open={open} onOpenChange={setOpen}>
        <Dialog.Portal>
          <Dialog.Overlay className="fixed inset-0 z-50 bg-black/30 backdrop-blur-[2px] dark:bg-black/60" />
          <Dialog.Content className="fixed left-1/2 top-[14vh] z-50 w-[640px] max-w-[calc(100vw-2rem)] -translate-x-1/2 overflow-hidden rounded-xl bg-surface shadow-3 hairline">
            <Dialog.Title className="sr-only">Search</Dialog.Title>
            <Command shouldFilter={false} label="Search">
              <div className="flex items-center gap-2 px-4 hairline-b">
                <Search className="size-4 text-ink-3" />
                <Command.Input value={q} onValueChange={setQ} autoFocus placeholder="Type a ticket number, INC reference, name, asset tag…" className="h-12 flex-1 bg-transparent text-[14px] outline-none" />
                <Kbd>esc</Kbd>
              </div>
              <Command.List className="max-h-[420px] overflow-y-auto p-2">
                <Command.Empty className="px-3 py-8 text-center text-[13px] text-ink-3">{q.trim().length < 2 ? "Start typing to search. Old Freshservice references like INC-4210 work too." : "No matches."}</Command.Empty>
                {!q.trim() && !portal && (
                  <Command.Group heading={<Heading>Go to</Heading>}>
                    {[
                      ["/inbox", "Inbox", <Inbox key="i" className="size-4" />],
                      ["/dashboard", "Dashboard", <BarChart3 key="d" className="size-4" />],
                      ["/assets", "Assets", <Laptop key="a" className="size-4" />],
                      ["/people", "People", <Users key="p" className="size-4" />],
                      ["/onboarding", "Joiners & leavers", <UserPlus key="o" className="size-4" />],
                      ["/settings", "Settings", <Settings key="s" className="size-4" />],
                    ].map(([href, label, icon]) => (
                      <Row key={href as string} onSelect={() => go(href as string)} icon={icon as React.ReactNode}>
                        {label as string}
                      </Row>
                    ))}
                  </Command.Group>
                )}
                {res?.tickets.length ? (
                  <Command.Group heading={<Heading>Tickets</Heading>}>
                    {res.tickets.map((t) => (
                      <Row key={t.id} onSelect={() => go(portal ? `/portal/requests/${t.id}` : `/tickets/${t.id}`)} icon={<StatusDot status={t.status} className="mx-1" />}>
                        <span className="flex min-w-0 flex-1 items-center gap-2">
                          <span className="truncate">{t.subject}</span>
                          <span className="ml-auto shrink-0 font-mono text-[11px] text-ink-3">{t.legacyRef ?? `TF-${String(t.id).padStart(6, "0")}`}</span>
                        </span>
                      </Row>
                    ))}
                  </Command.Group>
                ) : null}
                {res?.people.length && !portal ? (
                  <Command.Group heading={<Heading>People</Heading>}>
                    {res.people.map((p) => (
                      <Row key={p.id} onSelect={() => go(`/people/${p.id}`)} icon={<Users className="size-4" />}>
                        <span className="truncate">{p.displayName}</span>
                        <span className="ml-auto truncate text-[12px] text-ink-3">{p.jobTitle}</span>
                      </Row>
                    ))}
                  </Command.Group>
                ) : null}
                {res?.assets.length && !portal ? (
                  <Command.Group heading={<Heading>Assets</Heading>}>
                    {res.assets.map((a) => (
                      <Row key={a.id} onSelect={() => go(`/assets/${a.id}`)} icon={<Laptop className="size-4" />}>
                        <span className="truncate">{a.name}</span>
                        <span className="ml-auto font-mono text-[11px] text-ink-3">{a.assetTag}</span>
                      </Row>
                    ))}
                  </Command.Group>
                ) : null}
                {q.trim().length >= 2 && !portal && (
                  <Command.Group heading={<Heading>More</Heading>}>
                    <Row onSelect={() => go(`/search?q=${encodeURIComponent(q)}`)} icon={<Ticket className="size-4" />}>
                      Full search for “{q}”
                    </Row>
                  </Command.Group>
                )}
              </Command.List>
            </Command>
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog.Root>
    </>
  );
}

function Heading({ children }: { children: React.ReactNode }) {
  return <span className="label block px-2 pb-1 pt-2">{children}</span>;
}
function Row({ children, icon, onSelect }: { children: React.ReactNode; icon: React.ReactNode; onSelect: () => void }) {
  return (
    <Command.Item onSelect={onSelect} className="flex h-9 cursor-pointer items-center gap-2.5 rounded-md px-2 text-[13px] text-ink">
      <span className="flex w-5 shrink-0 justify-center text-ink-3">{icon}</span>
      {children}
    </Command.Item>
  );
}
