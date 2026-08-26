import Link from "next/link";
import { format } from "date-fns";
import { requireStaff } from "@/lib/auth";
import { listReleasesIt } from "@/lib/modules";
import { Topbar } from "@/components/shell/topbar";
import { Avatar } from "@/components/ui/avatar";
import { Tone } from "@/components/ui/pills";

export const metadata = { title: "Releases" };

const TONE: Record<string, "ok" | "warn" | "info" | "neutral" | "violet"> = { planning: "neutral", scheduled: "info", deploying: "violet", deployed: "ok", cancelled: "warn" };

export default async function ReleasesPage() {
  await requireStaff();
  const rows = await listReleasesIt();
  return (
    <>
      <Topbar crumbs={[{ label: "Releases" }]} />
      <div className="flex-1 overflow-y-auto">
        <div className="mx-auto max-w-[1100px] px-6 py-6 rise">
          <h1 className="text-[20px] font-semibold tracking-[-0.01em]">Releases</h1>
          <p className="text-[13px] text-ink-3">A release groups the changes that ship together in one window, with one owner and one review.</p>
          <div className="mt-5 space-y-3">
            {rows.map(({ r, owner, changes, done }) => (
              <Link key={r.id} href={`/releases/${r.id}`} className="panel block p-4 transition-shadow hover:shadow-2">
                <div className="flex items-start gap-4">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="text-[14px] font-semibold">{r.name}</span>
                      {r.version && <span className="font-mono text-[11.5px] text-ink-3">{r.version}</span>}
                      <Tone tone={TONE[r.status] ?? "neutral"} className="capitalize">{r.status}</Tone>
                    </div>
                    <p className="mt-0.5 text-[12.5px] text-ink-3">{r.description}</p>
                    <div className="mt-3 flex items-center gap-3">
                      <span className="bar w-48">
                        <i style={{ width: `${changes ? (done / changes) * 100 : 0}%` }} />
                      </span>
                      <span className="tnum text-[12px] text-ink-3">{done} of {changes} changes done</span>
                    </div>
                  </div>
                  <div className="text-right text-[12.5px] text-ink-2">
                    <p className="tnum">{r.plannedStart ? format(r.plannedStart, "d MMM") : "—"} → {r.plannedEnd ? format(r.plannedEnd, "d MMM") : "—"}</p>
                    {owner && <p className="mt-1 flex items-center justify-end gap-1.5 text-ink-3"><Avatar name={owner} size={16} /> {owner}</p>}
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </div>
    </>
  );
}
