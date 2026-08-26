"use client";

import { useState, useTransition } from "react";
import { setSoftwareStatus } from "@/app/asset-actions";
import { cn, money } from "@/lib/utils";

type Row = { id: number; name: string; vendor: string | null; category: string | null; licenceModel: string; version: string; status: string; cost: string };
const STATUS_LABEL: Record<string, string> = { in_review: "In Review", ignored: "Ignored", managed: "Managed" };

/** Freshservice's Software tab: Software / Version / Status — with the status actually editable inline. */
export function SoftwareTable({ assetId, rows, monthly }: { assetId: number; rows: Row[]; monthly: number }) {
  const [q, setQ] = useState("");
  const [pending, start] = useTransition();
  const list = rows.filter((r) => r.name.toLowerCase().includes(q.toLowerCase()));
  return (
    <div aria-busy={pending}>
      <div className="mb-3 flex items-center gap-3">
        <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Type 3 or more letters to search" className="h-8 w-[380px] rounded-md bg-surface px-3 text-[13px] hairline focus:outline-none focus:shadow-[inset_0_0_0_1px_var(--accent),0_0_0_3px_var(--ring)]" />
        <span className="ml-auto text-[12.5px] text-ink-3">
          {list.length} of {rows.length} · {money(monthly)} / month in licences
        </span>
        <a href="/api/assets.csv" className="text-[12.5px] font-medium text-accent-ink hover:underline">
          Export
        </a>
      </div>
      <div className="rounded-lg bg-surface hairline">
        <table className="w-full text-[13px]">
          <thead>
            <tr className="text-left [&>th]:h-9 [&>th]:px-4">
              <th className="label">Software</th>
              <th className="label">Version</th>
              <th className="label">Licence</th>
              <th className="label">Status</th>
            </tr>
          </thead>
          <tbody>
            {list.map((r) => (
              <tr key={r.id} className="row hairline-t">
                <td className="px-4 py-2">
                  <span className="font-medium text-accent-ink">{r.name}</span>
                  <span className="ml-2 text-[11.5px] text-ink-3">{r.vendor}</span>
                </td>
                <td className="px-4 py-2 font-mono text-[12px] text-ink-2">{r.version}</td>
                <td className="px-4 py-2">
                  <span className={cn("capitalize", r.licenceModel === "unlicensed" ? "font-medium text-warn" : "text-ink-3")}>{r.licenceModel}</span>
                </td>
                <td className="px-4 py-2">
                  <select value={r.status} onChange={(e) => start(() => setSoftwareStatus(assetId, r.id, e.target.value as "in_review" | "ignored" | "managed"))} className={cn("h-7 rounded-md bg-surface px-2 text-[12.5px] hairline focus:outline-none", r.status === "managed" && "text-ok", r.status === "ignored" && "text-ink-3")}>
                    {Object.entries(STATUS_LABEL).map(([v, l]) => (
                      <option key={v} value={v}>
                        {l}
                      </option>
                    ))}
                  </select>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
