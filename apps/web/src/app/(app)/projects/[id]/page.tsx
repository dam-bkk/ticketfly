import Link from "next/link";
import { notFound } from "next/navigation";
import { requireStaff } from "@/lib/auth";
import { getProject } from "@/lib/modules";
import { cn } from "@/lib/utils";
import { Topbar } from "@/components/shell/topbar";
import { Avatar } from "@/components/ui/avatar";
import { Tone } from "@/components/ui/pills";
import { Grid } from "./grid";
import { Gantt } from "./gantt";

export default async function ProjectPage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ view?: string }> }) {
  await requireStaff();
  const { id } = await params;
  const { view = "grid" } = await searchParams;
  const data = await getProject(Number(id));
  if (!data) notFound();
  const { p, owner, rows, people } = data;
  const top = rows.filter((r) => !r.r.parentId);
  const pct = top.length ? Math.round(top.reduce((s, r) => s + r.r.percent, 0) / top.length) : 0;
  const flat = rows.map(({ r, owner: o }) => ({ id: r.id, parentId: r.parentId, title: r.title, status: r.status, ownerId: r.ownerId, owner: o, startDate: r.startDate, endDate: r.endDate, percent: r.percent, priority: r.priority, notes: r.notes, ticketId: r.ticketId }));
  return (
    <>
      <Topbar crumbs={[{ label: "Projects", href: "/projects" }, { label: p.name }]} />
      <div className="flex shrink-0 items-center gap-4 bg-surface px-5 py-3 hairline-b">
        <div className="min-w-0">
          <h1 className="truncate text-[16px] font-semibold tracking-[-0.01em]">{p.name}</h1>
          <p className="truncate text-[12.5px] text-ink-3">{p.description}</p>
        </div>
        <Tone tone={p.status === "active" ? "ok" : "info"} className="capitalize">{p.status}</Tone>
        <span className="flex items-center gap-2 text-[12.5px] text-ink-3">
          <span className="bar w-28"><i style={{ width: `${pct}%` }} /></span> {pct}%
        </span>
        {owner && <span className="flex items-center gap-1.5 text-[12.5px] text-ink-3"><Avatar name={owner} size={18} /> {owner}</span>}
        <nav className="ml-auto flex gap-1 rounded-lg bg-surface-2 p-1">
          {[["grid", "Grid"], ["gantt", "Gantt"], ["board", "Board"]].map(([k, l]) => (
            <Link key={k} href={`/projects/${p.id}?view=${k}`} className={cn("h-7 rounded-md px-3 text-[12.5px] font-medium leading-7 text-ink-2", view === k ? "bg-surface text-ink shadow-1" : "hover:text-ink")}>{l}</Link>
          ))}
        </nav>
      </div>
      <div className="min-h-0 flex-1 overflow-auto">
        {view === "grid" && <Grid projectId={p.id} rows={flat} people={people} />}
        {view === "gantt" && <Gantt rows={flat} start={p.startDate} end={p.endDate} />}
        {view === "board" && (
          <div className="flex min-w-max gap-3 p-4">
            {["not_started", "in_progress", "blocked", "done"].map((s) => (
              <section key={s} className="w-[280px] shrink-0 rounded-xl bg-surface-2/60">
                <header className="flex items-center gap-2 px-3 py-2.5 text-[13px] font-medium capitalize">{s.replace("_", " ")}<span className="tnum ml-auto text-[12px] text-ink-3">{flat.filter((r) => r.status === s && r.title).length}</span></header>
                <div className="space-y-2 px-2 pb-2">
                  {flat.filter((r) => r.status === s && r.title).map((r) => (
                    <div key={r.id} className="rounded-lg bg-surface p-3 text-[13px] hairline">
                      <p className="font-medium">{r.title}</p>
                      <p className="mt-1 flex items-center gap-2 text-[11.5px] text-ink-3">{r.owner && <><Avatar name={r.owner} size={16} /> {r.owner.split(" ")[0]}</>}<span className="ml-auto tnum">{r.endDate ?? ""}</span></p>
                    </div>
                  ))}
                </div>
              </section>
            ))}
          </div>
        )}
      </div>
    </>
  );
}
