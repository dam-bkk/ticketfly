"use client";

import { useState, useTransition } from "react";
import { setSoftwareStatus } from "@/app/asset-actions";
import { cn, money } from "@/lib/utils";
import { Input, Select } from "@/components/ui/input";

type Row = { id: number; name: string; vendor: string | null; category: string | null; licenceModel: string; version: string; status: string; cost: string };
const STATUS_LABEL: Record<string, string> = { in_review: "In Review", ignored: "Ignored", managed: "Managed" };

/** Software tab: Software / Version / Licence / Status — status is editable inline. */
export function SoftwareTable({ assetId, rows, monthly }: { assetId: number; rows: Row[]; monthly: number }) {
  const [q, setQ] = useState("");
  const [pending, start] = useTransition();
  const list = rows.filter((r) => r.name.toLowerCase().includes(q.toLowerCase()));
  return (
    <div aria-busy={pending}>
      <div className="mb-3 flex items-center gap-3">
        <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search software" className="h-8 w-[380px] text-[13.5px]" />
        <span className="ml-auto text-[12.5px] text-ink-3">
          {list.length} of {rows.length} · {money(monthly)} / month in licences
        </span>
        <a href="/api/assets.csv" className="text-[12.5px] font-medium text-accent-ink hover:underline">
          Export
        </a>
      </div>
      <div className="rounded-lg bg-surface hairline">
        <table className="w-full text-[13.5px]">
          <thead>
            <tr className="text-left [&>th]:h-9 [&>th]:px-4">
              <th className="label">Software</th>
              <th className="label">Version</th>
              <th className="label">Licence</th>
              <th className="label w-[164px]">Status</th>
            </tr>
          </thead>
          <tbody>
            {list.map((r) => (
              <tr key={r.id} className="row hairline-t">
                <td className="px-4 py-2">
                  <span className="font-medium text-accent-ink">{r.name}</span>
                  <span className="ml-2 text-[11px] text-ink-3">{r.vendor}</span>
                </td>
                <td className="px-4 py-2 font-mono text-[12.5px] text-ink-2">{r.version}</td>
                <td className="px-4 py-2">
                  <span className={cn("capitalize", r.licenceModel === "unlicensed" ? "font-medium text-warn" : "text-ink-3")}>{r.licenceModel}</span>
                </td>
                <td className="px-4 py-2">
                  <Select value={r.status} onChange={(e) => start(() => setSoftwareStatus(assetId, r.id, e.target.value as "in_review" | "ignored" | "managed"))} className={cn("h-7 w-[132px] text-[12.5px]", r.status === "managed" && "text-ok", r.status === "ignored" && "text-ink-3")}>
                    {Object.entries(STATUS_LABEL).map(([v, l]) => (
                      <option key={v} value={v}>
                        {l}
                      </option>
                    ))}
                  </Select>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
