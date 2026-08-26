import Link from "next/link";
import { notFound } from "next/navigation";
import { Archive, Building2, Laptop, Mail, MapPin, Smartphone, UserRound } from "lucide-react";
import { and, asc, or, isNull } from "drizzle-orm";
import { requireStaff } from "@/lib/auth";
import { getTicket, listAgents, listCategories, listGroups } from "@/lib/queries";
import { longTime, relTime, shortTime, STATUS_LABEL } from "@/lib/utils";
import { Topbar } from "@/components/shell/topbar";
import { Avatar } from "@/components/ui/avatar";
import { KindTag, PriorityMark, StatusDot, StatusPill, Tag } from "@/components/ui/pills";
import { Composer } from "./composer";
import { HeaderActions } from "./header-actions";
import { CustomFields } from "./custom-fields";
import { Markdown } from "@/components/ui/markdown";
import { SCENARIOS } from "@/lib/automation";
import { workspaceContext } from "@/lib/workspace";
import { Paperclip } from "lucide-react";
import { Properties } from "./properties";
import { SlaBlock } from "./sla-block";
import { TaskList } from "@/components/ui/task-list";
import { listTasksFor } from "@/lib/modules";
import { db, schema } from "@ticketfly/db";
import { eq } from "drizzle-orm";

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const [row] = await db.select({ ref: schema.tickets.ref }).from(schema.tickets).where(eq(schema.tickets.id, Number(id))).limit(1);
  return { title: row?.ref ?? `#${id}` };
}

export default async function TicketPage({ params }: { params: Promise<{ id: string }> }) {
  const me = await requireStaff();
  const { id } = await params;
  const [data, agents, groups, categories] = await Promise.all([getTicket(Number(id)), listAgents(), listGroups(), listCategories()]);
  if (!data) notFound();
  const { ticket: t, requester, messages, assignee, manager, devices, recent, activity, sla } = data;
  const tasks = await listTasksFor("ticket", t.id);
  const { current } = await workspaceContext(me);
  const files = await db.select({ id: schema.attachments.id, name: schema.attachments.name, size: schema.attachments.size, mime: schema.attachments.mime, createdAt: schema.attachments.createdAt }).from(schema.attachments).where(eq(schema.attachments.ticketId, t.id)).orderBy(asc(schema.attachments.createdAt));
  const customFields = await db.select().from(schema.customFields).where(and(eq(schema.customFields.entity, "ticket"), or(isNull(schema.customFields.workspace), eq(schema.customFields.workspace, t.workspace)))).orderBy(asc(schema.customFields.position));
  void current;
  const problem = t.problemId ? (await db.select({ id: schema.problems.id, title: schema.problems.title, workaround: schema.problems.workaround, status: schema.problems.status }).from(schema.problems).where(eq(schema.problems.id, t.problemId)).limit(1))[0] ?? null : null;
  const ref = t.ref;

  return (
    <>
      <Topbar crumbs={[{ label: "Tickets", href: "/tickets" }, { label: ref }]} actions={<HeaderActions ticketId={t.id} status={t.status} />} />
      <div className="flex min-h-0 flex-1">
        {/* Conversation */}
        <div className="flex min-w-0 flex-1 flex-col">
          <div className="shrink-0 px-8 pt-6 pb-4">
            <div className="flex items-center gap-2 text-[12px] text-ink-3">
              <span className="font-mono">{ref}</span>
              {t.legacyRef && (
                <span className="inline-flex items-center gap-1 rounded bg-surface-2 px-1.5 py-0.5 text-[11px] font-medium text-ink-2">
                  <Archive className="size-3" /> Imported from Freshservice
                </span>
              )}
              <KindTag kind={t.kind} />
              <span aria-hidden>·</span>
              <span>Opened {longTime(t.createdAt)}</span>
              <span aria-hidden>·</span>
              <span className="capitalize">via {t.source}</span>
            </div>
            <h1 className="mt-1.5 text-[20px] font-semibold leading-snug tracking-[-0.01em] text-ink" style={{ textWrap: "balance" }}>
              {t.subject}
            </h1>
            <div className="mt-2.5 flex items-center gap-2">
              <StatusPill status={t.status} />
              <PriorityMark priority={t.priority} withLabel className="rounded-md bg-surface-2 px-2 py-1" />
              {t.tags.map((tag) => (
                <Tag key={tag}>{tag}</Tag>
              ))}
            </div>
          </div>

          <div className="min-h-0 flex-1 overflow-y-auto px-8 pb-6">
            <ol className="relative space-y-5 before:absolute before:bottom-2 before:left-[15px] before:top-2 before:w-px before:bg-line">
              {/* Original description */}
              <li className="relative flex gap-4">
                <Avatar name={requester?.displayName ?? "?"} size={32} className="relative z-10 ring-4 ring-canvas" />
                <div className="min-w-0 flex-1 rounded-xl bg-surface p-4 hairline">
                  <div className="flex items-baseline gap-2 text-[12.5px]">
                    <span className="font-medium text-ink">{requester?.displayName}</span>
                    <span className="text-ink-3">{requester?.jobTitle}</span>
                    <span className="ml-auto text-ink-3" title={longTime(t.createdAt)}>
                      {shortTime(t.createdAt)}
                    </span>
                  </div>
                  {t.description ? <Markdown text={t.description} className="prose-tf mt-2 text-[13.5px] leading-relaxed text-ink" /> : <p className="mt-2 text-[13.5px] text-ink-3">No description.</p>}
                </div>
              </li>
              {messages.map(({ m, author, authorRole }) =>
                m.kind === "system" ? (
                  <li key={m.id} className="relative flex items-center gap-4 pl-[7px]">
                    <span className="relative z-10 size-[17px] rounded-full bg-canvas ring-4 ring-canvas">
                      <span className="absolute inset-[5px] rounded-full bg-ink-4" />
                    </span>
                    <span className="text-[12.5px] text-ink-3">
                      <span className="font-medium text-ink-2">{author ?? "Service Desk"}</span> {m.body} <span className="text-ink-4">· {relTime(m.createdAt)}</span>
                    </span>
                  </li>
                ) : (
                  <li key={m.id} className="relative flex gap-4">
                    <Avatar name={author ?? "?"} size={32} className="relative z-10 ring-4 ring-canvas" />
                    <div className={`min-w-0 flex-1 rounded-xl p-4 ${m.kind === "note" ? "bg-note" : "bg-surface hairline"}`}>
                      <div className="flex items-baseline gap-2 text-[12.5px]">
                        <span className="font-medium text-ink">{author}</span>
                        {m.kind === "note" ? <span className="rounded bg-warn-soft px-1.5 text-[11px] font-medium text-warn">Internal note</span> : authorRole && authorRole !== "requester" && authorRole !== "manager" ? <span className="text-ink-3">IT</span> : null}
                        <span className="ml-auto flex items-center gap-1 text-ink-3" title={longTime(m.createdAt)}>
                          {m.via === "email" && <Mail className="size-3" />}
                          {shortTime(m.createdAt)}
                        </span>
                      </div>
                      <Markdown text={m.body} className="prose-tf mt-2 text-[13.5px] leading-relaxed text-ink" />
                      {m.attachments.length > 0 && (
                        <div className="mt-3 flex flex-wrap gap-2">
                          {m.attachments.map((a) => (
                            <span key={a.name} className="rounded-md bg-surface-2 px-2 py-1 text-[12px]">
                              {a.name}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                  </li>
                ),
              )}
            </ol>
            {files.length > 0 && (
              <section className="mt-5 rounded-xl bg-surface p-4 hairline">
                <p className="label mb-2">Attachments · {files.length}</p>
                <ul className="flex flex-wrap gap-2">
                  {files.map((f) => (
                    <li key={f.id}>
                      <a href={`/api/attachments/${f.id}`} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1.5 rounded-md bg-surface-2 px-2.5 py-1.5 text-[12.5px] hover:bg-surface-3">
                        <Paperclip className="size-3.5 text-ink-3" /> {f.name} <span className="text-ink-4">{(f.size / 1024).toFixed(0)} KB</span>
                      </a>
                    </li>
                  ))}
                </ul>
              </section>
            )}
          </div>
          <Composer ticketId={t.id} status={t.status} requesterName={requester?.displayName ?? ""} scenarios={SCENARIOS} />
        </div>

        {/* Properties */}
        <aside className="w-[320px] shrink-0 overflow-y-auto bg-surface hairline-l">
          <Properties ticket={{ id: t.id, status: t.status, priority: t.priority, assigneeId: t.assigneeId, groupId: t.groupId, categoryId: t.categoryId }} agents={agents} groups={groups} categories={categories} department={requester?.department ?? null} />
          <CustomFields ticketId={t.id} fields={customFields} values={t.custom} />
          <SlaBlock first={sla.first} resolution={sla.resolution} status={t.status} />
          {problem && (
            <section className="px-5 py-4 hairline-t">
              <p className="label mb-2">Linked problem</p>
              <Link href={`/problems/${problem.id}`} className="block rounded-md p-2.5 hairline hover:bg-surface-2">
                <span className="block text-[13px] font-medium">{problem.title}</span>
                <span className="text-[12px] text-ink-3">PRB-{problem.id} · {problem.status.replace("_", " ")}</span>
              </Link>
              {problem.workaround && <p className="mt-2 rounded-md bg-note p-2.5 text-[12.5px] leading-relaxed"><span className="font-medium">Workaround: </span>{problem.workaround}</p>}
            </section>
          )}
          <section className="px-5 py-4 hairline-t">
            <p className="label mb-2">Tasks</p>
            <TaskList rows={tasks} parentType="ticket" parentId={t.id} back={`/tickets/${t.id}`} compact />
            {!problem && <Link href={`/problems/new?ticket=${t.id}`} className="mt-2 inline-block text-[12px] text-ink-3 hover:text-ink">Seen this before? Raise a problem →</Link>}
          </section>

          <section className="px-5 py-4 hairline-t">
            <p className="label mb-3">Requester</p>
            <div className="flex items-center gap-3">
              <Avatar name={requester?.displayName ?? "?"} size={36} />
              <div className="min-w-0">
                <Link href={`/people/${requester?.id}`} className="block truncate text-[13.5px] font-medium hover:underline">
                  {requester?.displayName}
                </Link>
                <p className="truncate text-[12px] text-ink-3">{requester?.jobTitle}</p>
              </div>
            </div>
            <dl className="mt-3 space-y-1.5 text-[12.5px]">
              <Row icon={<Building2 className="size-3.5" />}>{requester?.department}</Row>
              <Row icon={<MapPin className="size-3.5" />}>{requester?.officeLocation}</Row>
              {manager && <Row icon={<UserRound className="size-3.5" />}>Reports to {manager.displayName}</Row>}
              <Row icon={<Mail className="size-3.5" />}>
                <span className="truncate">{requester?.email}</span>
              </Row>
            </dl>
            {devices.length > 0 && (
              <div className="mt-3 space-y-1">
                {devices.map((d) => (
                  <Link key={d.id} href={`/assets/${d.id}`} className="flex items-center gap-2 rounded-md px-2 py-1.5 text-[12.5px] hairline hover:bg-surface-2">
                    {d.type === "mobile" ? <Smartphone className="size-3.5 text-ink-3" /> : <Laptop className="size-3.5 text-ink-3" />}
                    <span className="min-w-0 flex-1 truncate">{d.model}</span>
                    <span className={`size-1.5 rounded-full ${d.compliance === "compliant" ? "bg-ok" : d.compliance === "non_compliant" ? "bg-crit" : "bg-ink-4"}`} title={d.compliance} />
                    <span className="text-[11px] text-ink-3">{d.lastSeenCity}</span>
                  </Link>
                ))}
              </div>
            )}
          </section>

          {recent.length > 0 && (
            <section className="px-5 py-4 hairline-t">
              <p className="label mb-2">Other tickets from {requester?.displayName.split(" ")[0]}</p>
              <ul className="space-y-0.5">
                {recent.map((r) => (
                  <li key={r.id}>
                    <Link href={`/tickets/${r.id}`} className="flex items-center gap-2 rounded-md px-1.5 py-1 text-[12.5px] hover:bg-surface-2">
                      <StatusDot status={r.status} />
                      <span className="min-w-0 flex-1 truncate text-ink-2">{r.subject}</span>
                      <span className="text-[11px] text-ink-4">{relTime(r.createdAt)}</span>
                    </Link>
                  </li>
                ))}
              </ul>
            </section>
          )}

          {t.legacyRef && t.raw ? (
            <section className="px-5 py-4 hairline-t">
              <p className="label mb-2">Freshservice record</p>
              <dl className="grid grid-cols-[auto_1fr] gap-x-3 gap-y-1 text-[12px]">
                {Object.entries(t.raw as Record<string, unknown>).map(([k, v]) => (
                  <Fragment key={k} k={k} v={String(v)} />
                ))}
              </dl>
            </section>
          ) : null}

          <section className="px-5 py-4 hairline-t">
            <p className="label mb-2">Activity</p>
            {activity.length === 0 ? (
              <p className="text-[12px] text-ink-3">No changes recorded yet.</p>
            ) : (
              <ul className="space-y-1.5">
                {activity.slice(0, 8).map((a) => (
                  <li key={a.id} className="text-[12px] text-ink-3">
                    <span className="font-medium text-ink-2">{a.actorName}</span> <span className="font-mono text-[11px]">{a.action}</span>
                    {a.after && typeof a.after === "object" && "status" in (a.after as object) ? ` → ${STATUS_LABEL[(a.after as { status: string }).status] ?? ""}` : ""}
                    <span className="text-ink-4"> · {relTime(a.ts)}</span>
                  </li>
                ))}
              </ul>
            )}
          </section>
          <p className="px-5 pb-5 pt-2 text-[11px] text-ink-4">Viewing as {me.displayName}</p>
        </aside>
      </div>
    </>
  );
}

function Row({ icon, children }: { icon: React.ReactNode; children: React.ReactNode }) {
  return (
    <div className="flex items-center gap-2 text-ink-2">
      <span className="text-ink-3">{icon}</span>
      <span className="min-w-0 truncate">{children}</span>
    </div>
  );
}
function Fragment({ k, v }: { k: string; v: string }) {
  return (
    <>
      <dt className="font-mono text-ink-3">{k}</dt>
      <dd className="truncate text-ink-2">{v}</dd>
    </>
  );
}
