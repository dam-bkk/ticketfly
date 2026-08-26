"use client";

import { useRef, useState, useTransition } from "react";
import { Check, Paperclip, Send } from "lucide-react";
import { replyToTicket } from "@/app/actions";
import { requesterCloseTicket, uploadAttachment } from "@/app/extra-actions";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/input";

/**
 * Requester composer: the same shape as the agent composer — one paperclip inside the box
 * (hidden file input + label), Send on the right, and "This is fixed — close it" beside it
 * for the requester to resolve their own request.
 */
export function PortalComposer({ ticketId, status, canClose }: { ticketId: number; status: string; canClose: boolean }) {
  const [pending, start] = useTransition();
  const [confirmClose, setConfirmClose] = useState(false);
  const formRef = useRef<HTMLFormElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const [files, setFiles] = useState<string[]>([]);

  const submit = (fd: FormData) =>
    start(async () => {
      await replyToTicket(ticketId, fd);
      if (fileRef.current?.files?.length) {
        const up = new FormData();
        for (const f of fileRef.current.files) up.append("files", f);
        await uploadAttachment(ticketId, up);
      }
      formRef.current?.reset();
      setFiles([]);
    });

  return (
    <div className="mt-6" aria-busy={pending}>
      <form ref={formRef} action={submit} className="rounded-2xl bg-surface p-4 shadow-1 hairline">
        <Textarea name="body" required placeholder={status === "pending" ? "IT is waiting for your reply…" : "Add more detail or ask a question"} className="min-h-20 resize-none shadow-none focus:shadow-none" />
        <div className="mt-2 flex items-center gap-2">
          <input ref={fileRef} id={`files-${ticketId}`} type="file" multiple className="sr-only" onChange={(e) => setFiles([...(e.target.files ?? [])].map((f) => f.name))} />
          <label htmlFor={`files-${ticketId}`} className="inline-flex h-8 cursor-pointer items-center gap-1.5 rounded-md px-2 text-[12.5px] text-ink-3 hover:bg-surface-2 hover:text-ink">
            <Paperclip className="size-4" />
            <span className="max-w-[220px] truncate">{files.length ? files.join(", ") : "Attach files"}</span>
            <span className="text-ink-3">(&lt; 40 MB)</span>
          </label>
          <Button type="submit" variant="primary" disabled={pending} className="ml-auto">
            <Send className="size-3.5" /> Send
          </Button>
        </div>
      </form>
      <div className="mt-2 flex flex-wrap items-center justify-between gap-2 px-1 text-[12px] text-ink-3">
        <span>Replies also go by email — you can answer from your inbox.</span>
        {canClose && !confirmClose && (
          <button type="button" onClick={() => setConfirmClose(true)} className="inline-flex items-center gap-1.5 font-medium text-ink-2 hover:text-ink">
            <Check className="size-3.5" /> This is fixed — close it
          </button>
        )}
        {canClose && confirmClose && (
          <span className="inline-flex items-center gap-1.5">
            <span className="text-ink-2">Close this request?</span>
            <Button size="sm" variant="primary" disabled={pending} onClick={() => start(async () => { await requesterCloseTicket(ticketId); setConfirmClose(false); })}>Yes, it is fixed</Button>
            <Button size="sm" variant="ghost" disabled={pending} onClick={() => setConfirmClose(false)}>Keep open</Button>
          </span>
        )}
      </div>
    </div>
  );
}
