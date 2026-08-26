import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { ArrowLeft, Check } from "lucide-react";
import { formatTicketRef } from "@ticketfly/core";
import { replyToTicket } from "@/app/actions";
import { requirePrincipal } from "@/lib/auth";
import { getTicket } from "@/lib/queries";
import { cn, longTime, relTime, shortTime } from "@/lib/utils";
import { Avatar } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/input";
import { Markdown } from "@/components/ui/markdown";
import { uploadAttachment } from "@/app/extra-actions";
import { db, schema } from "@ticketfly/db";
import { asc, eq } from "drizzle-orm";
import { Paperclip } from "lucide-react";

export default async function RequestPage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ new?: string }> }) {
  const me = await requirePrincipal();
  const { id } = await params;
  const { new: isNew } = await searchParams;
  const data = await getTicket(Number(id));
  if (!data) notFound();
  const { ticket: t, requester, messages, assignee, sla } = data;
  const staff = me.role === "agent" || me.role === "admin" || me.role === "hr";
  if (!staff && t.requesterId !== me.id) redirect("/portal");
  const visible = messages.filter(({ m }) => m.kind !== "note");
  const files = await db.select({ id: schema.attachments.id, name: schema.attachments.name, size: schema.attachments.size }).from(schema.attachments).where(eq(schema.attachments.ticketId, t.id)).orderBy(asc(schema.attachments.createdAt));
  const steps = ["Received", "Picked up", "In progress", "Resolved"];
  const stepIdx = t.status === "resolved" || t.status === "closed" ? 3 : t.status === "in_progress" || t.status === "pending" || t.status === "on_hold" ? 2 : assignee ? 1 : 0;
  const closed = t.status === "resolved" || t.status === "closed";

  return (
    <div className="mx-auto max-w-2xl pt-10 rise">
      <Link href="/portal/requests" className="inline-flex items-center gap-1.5 text-[13px] text-ink-3 hover:text-ink">
        <ArrowLeft className="size-3.5" /> My requests
      </Link>

      {isNew && (
        <div className="mt-5 flex items-center gap-3 rounded-xl bg-ok-soft px-4 py-3 text-[13.5px] text-ok">
          <span className="flex size-6 items-center justify-center rounded-full bg-ok text-white">
            <Check className="size-3.5" strokeWidth={3} />
          </span>
          Sent. Your reference is <span className="font-mono font-medium">{formatTicketRef(t.id)}</span> — we have emailed you a copy.
        </div>
      )}

      <p className="mt-6 font-mono text-[12px] text-ink-3">
        {t.legacyRef ?? formatTicketRef(t.id)} · raised {longTime(t.createdAt)}
      </p>
      <h1 className="mt-1 text-[26px] font-semibold leading-tight tracking-[-0.015em]" style={{ textWrap: "balance" }}>
        {t.subject}
      </h1>

      <ol className="mt-6 grid grid-cols-4 gap-2">
        {steps.map((s, i) => (
          <li key={s} className="text-[12px]">
            <div className={cn("h-1 rounded-full", i <= stepIdx ? (i === 3 ? "bg-ok" : "bg-accent") : "bg-surface-3")} />
            <p className={cn("mt-1.5 font-medium", i <= stepIdx ? "text-ink" : "text-ink-4")}>{s}</p>
            {i === stepIdx && !closed && <p className="text-ink-3">{t.status === "pending" ? "Waiting for your reply" : t.status === "on_hold" ? "Waiting on a third party" : assignee ? `${assignee.displayName.split(" ")[0]} is on it` : `Expected reply ${relTime(sla.first.dueAt)}`}</p>}
            {i === 3 && closed && <p className="text-ink-3">{t.resolvedAt ? relTime(t.resolvedAt) : ""}</p>}
          </li>
        ))}
      </ol>

      {assignee && (
        <div className="mt-6 flex items-center gap-3 rounded-xl bg-surface p-4 hairline">
          <Avatar name={assignee.displayName} size={36} />
          <div className="text-[13px]">
            <p className="font-medium">{assignee.displayName}</p>
            <p className="text-ink-3">{assignee.jobTitle} · IT</p>
          </div>
        </div>
      )}

      <section className="mt-8 space-y-4">
        <Message name={requester?.displayName ?? ""} mine={requester?.id === me.id} time={t.createdAt} body={t.description} />
        {visible.map(({ m, author }) =>
          m.kind === "system" ? (
            <p key={m.id} className="px-2 text-center text-[12px] text-ink-4">
              {m.body} · {relTime(m.createdAt)}
            </p>
          ) : (
            <Message key={m.id} name={author ?? "IT"} mine={m.authorId === me.id} time={m.createdAt} body={m.body} it={m.authorId !== requester?.id} />
          ),
        )}
      </section>

      {files.length > 0 && (
        <section className="mt-6 rounded-xl bg-surface p-4 hairline">
          <p className="label mb-2">Attachments</p>
          <ul className="flex flex-wrap gap-2">
            {files.map((f) => (
              <li key={f.id}><a href={`/api/attachments/${f.id}`} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1.5 rounded-md bg-surface-2 px-2.5 py-1.5 text-[12.5px] hover:bg-surface-3"><Paperclip className="size-3.5 text-ink-3" /> {f.name}</a></li>
            ))}
          </ul>
        </section>
      )}
      {!closed ? (
        <>
          <form action={replyToTicket.bind(null, t.id)} className="mt-6 rounded-2xl bg-surface p-4 shadow-1 hairline">
            <Textarea name="body" required placeholder={t.status === "pending" ? "IT is waiting for your reply…" : "Add more detail or ask a question"} className="min-h-20 shadow-none focus:shadow-none" />
            <div className="mt-2 flex items-center justify-between">
              <span className="text-[12px] text-ink-3">Replies also go by email — you can answer from your inbox.</span>
              <Button type="submit" variant="primary">Send</Button>
            </div>
          </form>
          <form action={uploadAttachment.bind(null, t.id)} className="mt-2 flex items-center gap-2 px-1 text-[12.5px] text-ink-3">
            <Paperclip className="size-3.5" />
            <input type="file" name="files" multiple className="text-[12px]" />
            <Button type="submit" variant="ghost" size="sm">Attach</Button>
            <span className="text-ink-4">screenshots help — under 40 MB each</span>
          </form>
        </>
      ) : (
        <div className="mt-6 rounded-2xl bg-surface p-5 text-center hairline">
          <p className="text-[14px] font-medium">How did we do?</p>
          <p className="text-[12.5px] text-ink-3">One tap. It shapes how the desk is run.</p>
          <div className="mt-3 flex justify-center gap-2">
            {["Poor", "OK", "Good", "Great", "Excellent"].map((l, i) => (
              <button key={l} type="button" className={cn("h-9 rounded-full px-4 text-[13px] font-medium hairline hover:bg-surface-2", t.satisfaction === i + 1 && "bg-accent-soft text-accent-ink")}>
                {l}
              </button>
            ))}
          </div>
          <p className="mt-3 text-[12px] text-ink-4">Not fixed? Reply to the email and it reopens automatically.</p>
        </div>
      )}
    </div>
  );
}

function Message({ name, mine, time, body, it }: { name: string; mine: boolean; time: Date; body: string; it?: boolean }) {
  return (
    <div className={cn("flex gap-3", mine && "flex-row-reverse")}>
      <Avatar name={name} size={30} />
      <div className={cn("max-w-[80%] rounded-2xl px-4 py-3", mine ? "rounded-tr-md bg-accent-soft" : "rounded-tl-md bg-surface hairline")}>
        <p className="flex items-baseline gap-2 text-[12px]">
          <span className="font-medium text-ink">{name}</span>
          {it && !mine && <span className="text-ink-3">IT</span>}
          <span className="text-ink-4">{shortTime(time)}</span>
        </p>
        <Markdown text={body} className="mt-1 text-[13.5px] leading-relaxed" />
      </div>
    </div>
  );
}
