"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { ArrowUpRight, BookOpen } from "lucide-react";
import { suggestArticles } from "@/app/extra-actions";

/**
 * Live KB deflection. Sits inside the request form, listens to the text fields around it,
 * and after a 300 ms pause asks the server for up to three matching published guides.
 * Renders nothing until there is a match, so the three-field form stays as simple as before.
 */
export function Deflection() {
  const anchor = useRef<HTMLDivElement>(null);
  const [hits, setHits] = useState<{ id: number; title: string }[]>([]);
  const last = useRef("");

  useEffect(() => {
    const form = anchor.current?.closest("form");
    if (!form) return;
    let timer: ReturnType<typeof setTimeout> | undefined;
    let seq = 0;
    const read = () =>
      [...form.querySelectorAll<HTMLInputElement | HTMLTextAreaElement>("textarea, input[type=text], input:not([type])")]
        .map((el) => el.value.trim())
        .filter(Boolean)
        .join(" ");
    const onInput = () => {
      clearTimeout(timer);
      timer = setTimeout(async () => {
        const q = read();
        if (q === last.current) return;
        last.current = q;
        if (q.length < 4) return setHits([]);
        const mine = ++seq;
        const rows = await suggestArticles(q);
        if (mine === seq) setHits(rows);
      }, 300);
    };
    form.addEventListener("input", onInput);
    return () => {
      form.removeEventListener("input", onInput);
      clearTimeout(timer);
    };
  }, []);

  return (
    <div ref={anchor} data-deflection className={hits.length ? "rounded-xl bg-accent-soft/60 p-4" : "hidden"} aria-live="polite">
      {hits.length > 0 && (<>
      <p className="flex items-center gap-2 text-[13px] font-medium text-ink">
        <BookOpen className="size-4 text-accent-ink" /> Might this solve it?
      </p>
      <ul className="mt-2 space-y-1">
        {hits.map((h) => (
          <li key={h.id}>
            <Link href={`/portal/help/${h.id}`} target="_blank" className="group flex items-center gap-2 rounded-md px-2 py-1.5 text-[13.5px] text-ink-2 hover:bg-surface hover:text-ink">
              <span className="min-w-0 flex-1 truncate">{h.title}</span>
              <ArrowUpRight className="size-3.5 shrink-0 text-ink-3 group-hover:text-accent-ink" />
            </Link>
          </li>
        ))}
      </ul>
      <p className="mt-2 text-[12px] text-ink-3">Opens in a new tab — your draft stays here.</p>
      </>)}
    </div>
  );
}
