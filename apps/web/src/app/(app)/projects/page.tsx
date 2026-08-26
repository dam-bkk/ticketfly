import Link from "next/link";
import { Plus, Table2 } from "lucide-react";
import { requireStaff } from "@/lib/auth";
import { listProjects } from "@/lib/modules";
import { Topbar } from "@/components/shell/topbar";
import { Avatar } from "@/components/ui/avatar";
import { ButtonLink } from "@/components/ui/button";
import { Tone } from "@/components/ui/pills";

export const metadata = { title: "Projects" };

export default async function ProjectsPage() {
  await requireStaff();
  const rows = await listProjects();
  return (
    <>
      <Topbar
        crumbs={[{ label: "Projects" }]}
        actions={
          <ButtonLink href="/projects/new" variant="secondary">
            <Plus className="size-3.5" /> New Project
          </ButtonLink>
        }
      />
      <div className="flex-1 overflow-y-auto">
        <div className="mx-auto max-w-[1100px] px-6 py-6 rise">
          <div className="flex items-end justify-between">
            <div>
              <h1 className="text-[20px] font-semibold tracking-[-0.01em]">Projects</h1>
              <p className="text-[13px] text-ink-3">A grid you type into — the Smartsheet feel, on the same data as tickets. Rows can link to tickets and changes.</p>
            </div>
            <span className="flex items-center gap-1.5 text-[12px] text-ink-3"><Table2 className="size-3.5" /> Grid · Gantt · Board</span>
          </div>
          <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {rows.map(({ p, owner, rows: n, done, pct }) => (
              <Link key={p.id} href={`/projects/${p.id}`} className="panel flex flex-col p-4 transition-shadow hover:shadow-2">
                <div className="flex items-start gap-2">
                  <span className="min-w-0 flex-1 text-[14px] font-semibold leading-snug">{p.name}</span>
                  <Tone tone={p.status === "active" ? "ok" : p.status === "planning" ? "info" : "neutral"} className="capitalize">{p.status}</Tone>
                </div>
                <p className="mt-1 flex-1 text-[12.5px] text-ink-3">{p.description}</p>
                <div className="mt-4 flex items-center gap-3">
                  <span className="bar flex-1"><i style={{ width: `${pct}%` }} /></span>
                  <span className="tnum text-[12px] text-ink-3">{pct}%</span>
                </div>
                <div className="mt-2 flex items-center justify-between text-[12px] text-ink-3">
                  <span>{done}/{n} rows done · {p.startDate} → {p.endDate}</span>
                  {owner && <span className="flex items-center gap-1.5"><Avatar name={owner} size={16} /> {owner.split(" ")[0]}</span>}
                </div>
                {p.workspace !== "it" && <span className="mt-2 self-start rounded bg-surface-2 px-1.5 text-[10.5px] font-medium uppercase tracking-[0.06em] text-ink-3">{p.workspace} workspace</span>}
              </Link>
            ))}
          </div>
        </div>
      </div>
    </>
  );
}
