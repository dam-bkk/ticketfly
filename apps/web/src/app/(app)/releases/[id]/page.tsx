import Link from "next/link";
import { notFound } from "next/navigation";
import { format } from "date-fns";
import { requireStaff } from "@/lib/auth";
import { getReleaseIt } from "@/lib/modules";
import { longTime } from "@/lib/utils";
import { Topbar } from "@/components/shell/topbar";
import { Avatar } from "@/components/ui/avatar";
import { ButtonLink } from "@/components/ui/button";
import { Tone } from "@/components/ui/pills";
import { Block, CHANGE_STATUS_LABEL, Prop, RecordHeader, RISK_TONE } from "@/components/ui/record";

export default async function ReleasePage({ params }: { params: Promise<{ id: string }> }) {
  await requireStaff();
  const { id } = await params;
  const data = await getReleaseIt(Number(id));
  if (!data) notFound();
  const { r, owner, changes } = data;
  const done = changes.filter((c) => c.status === "completed" || c.status === "closed").length;
  return (
    <>
      <Topbar crumbs={[{ label: "Releases", href: "/releases" }, { label: r.name }]} />
      <div className="flex min-h-0 flex-1 flex-col">
        <RecordHeader
          eyebrow={<><span className="font-mono">REL-{r.id}</span>{r.version && <> · {r.version}</>} · owner {owner}</>}
          title={r.name}
          chips={<><Tone tone={r.status === "deployed" ? "ok" : r.status === "scheduled" ? "info" : "neutral"} className="capitalize">{r.status}</Tone><span className="text-[12.5px] text-ink-3">{done} of {changes.length} changes done</span></>}
          actions={<ButtonLink href="/changes/new" size="sm" variant="secondary">Add change</ButtonLink>}
        />
        <div className="grid min-h-0 flex-1 grid-cols-[minmax(0,1fr)_300px] overflow-y-auto">
          <div className="space-y-4 px-6 py-4">
            <Block title="Changes in this release">
              {changes.length === 0 ? <p className="text-[13px] text-ink-3">No changes yet.</p> : (
                <ul className="divide-y divide-line">
                  {changes.map((c) => (
                    <li key={c.id} className="flex items-center gap-3 py-2 text-[13px]">
                      <Link href={`/changes/${c.id}`} className="min-w-0 flex-1 truncate font-medium text-accent-ink hover:underline">{c.title}</Link>
                      <span className="capitalize text-ink-3">{c.type}</span>
                      <Tone tone={(RISK_TONE[c.risk] ?? "neutral")} className="capitalize">{c.risk}</Tone>
                      <Tone tone={c.status === "completed" || c.status === "closed" ? "ok" : c.status === "in_progress" ? "violet" : "neutral"}>{CHANGE_STATUS_LABEL[c.status]}</Tone>
                      <span className="tnum w-24 text-right text-[12px] text-ink-3">{c.plannedStart ? format(c.plannedStart, "d MMM HH:mm") : "—"}</span>
                      {c.assignee && <Avatar name={c.assignee} size={18} />}
                    </li>
                  ))}
                </ul>
              )}
            </Block>
            <Block title="Description">
              <p className="text-[13.5px] leading-relaxed">{r.description || "—"}</p>
            </Block>
          </div>
          <aside className="space-y-2 bg-surface px-4 py-4 hairline-l">
            <p className="label">Window</p>
            <Prop label="Start">{r.plannedStart ? longTime(r.plannedStart) : "—"}</Prop>
            <Prop label="End">{r.plannedEnd ? longTime(r.plannedEnd) : "—"}</Prop>
            <Prop label="Owner">{owner ?? "—"}</Prop>
            <p className="pt-3 text-[11.5px] text-ink-4">Releases inherit their status from their changes: scheduled when all approved, deploying when any is in progress, deployed when all are complete.</p>
          </aside>
        </div>
      </div>
    </>
  );
}
