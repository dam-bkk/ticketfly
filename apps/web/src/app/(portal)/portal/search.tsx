"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowRight, Search } from "lucide-react";
import { ServiceIcon } from "./icons";

type S = { slug: string; name: string; tagline: string; icon: string };

const HINTS: [RegExp, string][] = [
  [/vpn|wifi|wi-fi|internet|network|slow/i, "report-issue"],
  [/password|locked|sign in|login|mfa|authenticator|2fa/i, "report-issue"],
  [/access|permission|folder|drive|sharepoint|group|mailbox/i, "access-request"],
  [/laptop|monitor|screen|mouse|keyboard|headset|dock/i, "hardware"],
  [/phone|sim|roaming|mobile/i, "mobile"],
  [/new (hire|starter|joiner|colleague)|onboard|join/i, "new-starter"],
  [/leav|resign|last day|offboard/i, "leaver"],
  [/phish|suspicious|scam|hack|lost/i, "security"],
  [/licen|install|adobe|figma|software|app/i, "software"],
  [/guest|visitor/i, "guest-wifi"],
];

export function PortalSearch({ services }: { services: S[] }) {
  const [q, setQ] = useState("");
  const router = useRouter();
  const matches = useMemo(() => {
    const term = q.trim();
    if (!term) return [];
    const bySlug = new Map(services.map((s) => [s.slug, s]));
    const hinted = HINTS.filter(([re]) => re.test(term)).map(([, slug]) => bySlug.get(slug)!).filter(Boolean);
    const text = services.filter((s) => `${s.name} ${s.tagline}`.toLowerCase().includes(term.toLowerCase()));
    const seen = new Set<string>();
    return [...hinted, ...text].filter((s) => (seen.has(s.slug) ? false : (seen.add(s.slug), true))).slice(0, 4);
  }, [q, services]);
  const go = (slug: string) => router.push(`/portal/new/${slug}?q=${encodeURIComponent(q)}`);
  return (
    <div className="relative">
      <div className="flex h-14 items-center gap-3 rounded-2xl bg-surface px-5 shadow-2 transition-shadow hairline focus-within:shadow-[0_0_0_4px_var(--ring),var(--shadow-2)]">
        <Search className="size-5 text-ink-3" />
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && matches[0]) go(matches[0].slug);
          }}
          placeholder="Describe it in your own words — “can’t get on the VPN”, “new colleague starts Monday”…"
          className="flex-1 bg-transparent text-[15px] outline-none"
        />
        {q && (
          <span className="hidden text-[11.5px] text-ink-3 sm:inline">
            press <kbd className="rounded px-1 hairline">↵</kbd>
          </span>
        )}
      </div>
      {matches.length > 0 && (
        <ul className="absolute inset-x-0 top-full z-30 mt-2 overflow-hidden rounded-xl bg-surface p-1.5 shadow-3 hairline">
          {matches.map((s, i) => (
            <li key={s.slug}>
              <button onClick={() => go(s.slug)} className={`flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left hover:bg-surface-2 ${i === 0 ? "bg-surface-2" : ""}`}>
                <span className="flex size-8 items-center justify-center rounded-md bg-accent-soft text-accent-ink">
                  <ServiceIcon name={s.icon} className="size-4" />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block text-[13.5px] font-medium">{s.name}</span>
                  <span className="block truncate text-[12px] text-ink-3">{s.tagline}</span>
                </span>
                <ArrowRight className="size-4 text-ink-3" />
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
