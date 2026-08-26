"use client";

import { useRef, useState, useTransition } from "react";
import { Lock, Paperclip, Send } from "lucide-react";
import { replyToTicket, updateTicket } from "@/app/actions";
import { Button } from "@/components/ui/button";
import { Kbd } from "@/components/ui/kbd";
import { cn } from "@/lib/utils";

const CANNED = [
  ["Acknowledge", "Thanks for reaching out — I have picked this up and will update you shortly."],
  ["Ask for details", "Could you tell me when this started and whether it happens on the office network as well as at home?"],
  ["Resolved", "This is now resolved on our side. Please confirm and I will close the ticket."],
];

export function Composer({ ticketId, status, requesterName }: { ticketId: number; status: string; requesterName: string }) {
  const [kind, setKind] = useState<"reply" | "note">("reply");
  const [pending, start] = useTransition();
  const ref = useRef<HTMLTextAreaElement>(null);
  const formRef = useRef<HTMLFormElement>(null);

  const submit = (fd: FormData, then?: "pending" | "resolved") => {
    fd.set("kind", kind);
    start(async () => {
      await replyToTicket(ticketId, fd);
      if (then) await updateTicket(ticketId, { status: then });
      formRef.current?.reset();
    });
  };

  return (
    <div className="shrink-0 px-8 pb-6">
      <form
        ref={formRef}
        action={(fd) => submit(fd)}
        onKeyDown={(e) => {
          if ((e.metaKey || e.ctrlKey) && e.key === "Enter") {
            e.preventDefault();
            formRef.current?.requestSubmit();
          }
        }}
        className={cn("rounded-xl bg-surface shadow-2 transition-colors hairline", kind === "note" && "bg-note")}
      >
        <div className="flex items-center gap-1 px-3 pt-2">
          {(["reply", "note"] as const).map((k) => (
            <button key={k} type="button" onClick={() => setKind(k)} className={cn("flex h-7 items-center gap-1.5 rounded-md px-2.5 text-[12.5px] font-medium text-ink-3 hover:text-ink", kind === k && "bg-surface-2 text-ink")}>
              {k === "note" && <Lock className="size-3" />}
              {k === "reply" ? `Reply to ${requesterName.split(" ")[0]}` : "Internal note"}
            </button>
          ))}
          <div className="ml-auto flex items-center gap-1">
            {CANNED.map(([label, text]) => (
              <button
                key={label}
                type="button"
                onClick={() => {
                  if (ref.current) {
                    ref.current.value = text ?? "";
                    ref.current.focus();
                  }
                }}
                className="h-6 rounded px-2 text-[11.5px] text-ink-3 hover:bg-surface-2 hover:text-ink"
              >
                {label}
              </button>
            ))}
          </div>
        </div>
        <textarea ref={ref} name="body" required placeholder={kind === "note" ? "Visible to IT only…" : "Write a reply… it goes out by email and shows in the portal."} className="block min-h-[96px] w-full resize-none bg-transparent px-4 py-3 text-[13.5px] leading-relaxed outline-none" />
        <div className="flex items-center gap-2 px-3 pb-3">
          <button type="button" className="inline-flex size-7 items-center justify-center rounded-md text-ink-3 hover:bg-surface-2 hover:text-ink" aria-label="Attach file">
            <Paperclip className="size-4" />
          </button>
          <span className="text-[11.5px] text-ink-4">
            <Kbd>⌘</Kbd> <Kbd>↵</Kbd> to send
          </span>
          <div className="ml-auto flex items-center gap-1.5">
            {kind === "reply" && status !== "resolved" && status !== "closed" && (
              <>
                <Button type="button" variant="ghost" size="sm" disabled={pending} onClick={() => formRef.current && submit(new FormData(formRef.current), "pending")}>
                  Send &amp; wait for reply
                </Button>
                <Button type="button" variant="ghost" size="sm" disabled={pending} onClick={() => formRef.current && submit(new FormData(formRef.current), "resolved")}>
                  Send &amp; resolve
                </Button>
              </>
            )}
            <Button type="submit" variant="primary" size="sm" disabled={pending}>
              <Send className="size-3.5" /> {kind === "note" ? "Add note" : "Send"}
            </Button>
          </div>
        </div>
      </form>
    </div>
  );
}
