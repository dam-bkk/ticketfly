import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { Topbar } from "@/components/shell/topbar";

/**
 * Module skeleton: same place in the navigation as Freshservice, honest about scope.
 * Each one names what it will hold, what it replaces, and which phase turns it on.
 */
export function ModuleStub({ title, replaces, phase, summary, will, related }: { title: string; replaces: string; phase: string; summary: string; will: string[]; related?: { href: string; label: string }[] }) {
  return (
    <>
      <Topbar crumbs={[{ label: title }]} />
      <div className="flex-1 overflow-y-auto">
        <div className="mx-auto max-w-[880px] px-6 py-8 rise">
          <div className="flex items-baseline gap-3">
            <h1 className="text-[20px] font-semibold tracking-[-0.01em]">{title}</h1>
            <span className="rounded bg-surface-2 px-1.5 py-0.5 text-[11px] font-medium text-ink-3">{phase}</span>
          </div>
          <p className="mt-1 max-w-[64ch] text-[13.5px] text-ink-2">{summary}</p>
          <p className="mt-1 text-[12.5px] text-ink-3">Replaces: {replaces}</p>
          <div className="panel mt-6 p-5">
            <p className="label mb-3">This module will hold</p>
            <ul className="grid gap-2 sm:grid-cols-2">
              {will.map((w) => (
                <li key={w} className="flex items-start gap-2 text-[13px] text-ink-2">
                  <span className="mt-[7px] size-1.5 shrink-0 rounded-full bg-ink-4" /> {w}
                </li>
              ))}
            </ul>
          </div>
          {related && related.length > 0 && (
            <div className="mt-4 flex flex-wrap gap-2">
              {related.map((r) => (
                <Link key={r.href} href={r.href} className="inline-flex h-8 items-center gap-1.5 rounded-md bg-surface px-3 text-[12.5px] font-medium text-ink-2 hairline hover:bg-surface-2 hover:text-ink">
                  {r.label} <ArrowRight className="size-3.5" />
                </Link>
              ))}
            </div>
          )}
        </div>
      </div>
    </>
  );
}
