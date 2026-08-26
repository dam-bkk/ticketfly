"use client";

import { useRef, useState, useTransition } from "react";
import { Bold, Italic, Link2, List, Lock, Paperclip, Send, Wand2 } from "lucide-react";
import * as DropdownMenu from "@radix-ui/react-dropdown-menu";
import { replyToTicket, updateTicket } from "@/app/actions";
import { applyScenario, uploadAttachment } from "@/app/extra-actions";
import { Button } from "@/components/ui/button";
import { Kbd } from "@/components/ui/kbd";
import { cn } from "@/lib/utils";

const CANNED = [
  ["Acknowledge", "Thanks for reaching out — I have picked this up and will update you shortly."],
  ["Ask for details", "Could you tell me when this started and whether it happens on the office network as well as at home?"],
  ["Resolved", "This is now resolved on our side. Please confirm and I will close the ticket."],
];

export function Composer({ ticketId, status, requesterName, scenarios }: { ticketId: number; status: string; requesterName: string; scenarios: { key: string; label: string; description: string }[] }) {
  const [kind, setKind] = useState<"reply" | "note">("reply");
  const [pending, start] = useTransition();
  const ref = useRef<HTMLTextAreaElement>(null);
  const formRef = useRef<HTMLFormElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const [files, setFiles] = useState<string[]>([]);

  const submit = (fd: FormData, then?: "pending" | "resolved") => {
    fd.set("kind", kind);
    start(async () => {
      await replyToTicket(ticketId, fd);
      if (fileRef.current?.files?.length) {
        const up = new FormData();
        for (const f of fileRef.current.files) up.append("files", f);
        await uploadAttachment(ticketId, up);
      }
      if (then) await updateTicket(ticketId, { status: then });
      formRef.current?.reset();
      setFiles([]);
    });
  };

  /** Markdown-lite formatting: wrap the selection. No HTML, no toolbar library — the four things people actually use. */
  const wrap = (before: string, after = before) => {
    const el = ref.current;
    if (!el) return;
    const { selectionStart: s, selectionEnd: e, value } = el;
    const sel = value.slice(s, e) || "text";
    el.value = value.slice(0, s) + before + sel + after + value.slice(e);
    el.focus();
    el.setSelectionRange(s + before.length, s + before.length + sel.length);
  };
  const prefixLines = (p: string) => {
    const el = ref.current;
    if (!el) return;
    const { selectionStart: s, selectionEnd: e, value } = el;
    const start = value.lastIndexOf("\n", s - 1) + 1;
    const block = value.slice(start, e);
    const out = block.split("\n").map((l) => (l.startsWith(p) ? l : p + l)).join("\n");
    el.value = value.slice(0, start) + out + value.slice(e);
    el.focus();
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
          if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "b") {
            e.preventDefault();
            wrap("**");
          }
          if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "i") {
            e.preventDefault();
            wrap("_");
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
          <span className="mx-1 h-4 w-px bg-line" />
          <Tool label="Bold (⌘B)" onClick={() => wrap("**")}><Bold className="size-3.5" /></Tool>
          <Tool label="Italic (⌘I)" onClick={() => wrap("_")}><Italic className="size-3.5" /></Tool>
          <Tool label="Bulleted list" onClick={() => prefixLines("- ")}><List className="size-3.5" /></Tool>
          <Tool label="Link" onClick={() => wrap("[", "](https://)")}><Link2 className="size-3.5" /></Tool>
          <div className="ml-auto flex items-center gap-1">
            {CANNED.map(([label, text]) => (
              <button key={label} type="button" onClick={() => { if (ref.current) { ref.current.value = text ?? ""; ref.current.focus(); } }} className="h-6 rounded px-2 text-[11.5px] text-ink-3 hover:bg-surface-2 hover:text-ink">
                {label}
              </button>
            ))}
            <DropdownMenu.Root>
              <DropdownMenu.Trigger asChild>
                <button type="button" className="inline-flex h-6 items-center gap-1 rounded px-2 text-[11.5px] font-medium text-accent-ink hover:bg-accent-soft"><Wand2 className="size-3" /> Scenarios</button>
              </DropdownMenu.Trigger>
              <DropdownMenu.Portal>
                <DropdownMenu.Content align="end" sideOffset={6} className="z-50 w-80 rounded-lg bg-surface p-1 shadow-3 hairline">
                  {scenarios.map((s) => (
                    <DropdownMenu.Item key={s.key} onSelect={() => start(() => applyScenario(ticketId, s.key))} className="cursor-pointer rounded-md px-2.5 py-2 outline-none data-[highlighted]:bg-surface-2">
                      <span className="block text-[13px] font-medium">{s.label}</span>
                      <span className="block text-[12px] text-ink-3">{s.description}</span>
                    </DropdownMenu.Item>
                  ))}
                </DropdownMenu.Content>
              </DropdownMenu.Portal>
            </DropdownMenu.Root>
          </div>
        </div>
        <textarea ref={ref} name="body" required placeholder={kind === "note" ? "Visible to IT only…" : "Write a reply… it goes out by email and shows in the portal. **bold**, _italic_, - lists, links."} className="block min-h-[96px] w-full resize-none bg-transparent px-4 py-3 text-[13.5px] leading-relaxed outline-none" />
        <div className="flex items-center gap-2 px-3 pb-3">
          <input ref={fileRef} type="file" multiple className="hidden" onChange={(e) => setFiles([...(e.target.files ?? [])].map((f) => f.name))} />
          <button type="button" onClick={() => fileRef.current?.click()} className="inline-flex h-7 items-center gap-1.5 rounded-md px-2 text-[12px] text-ink-3 hover:bg-surface-2 hover:text-ink" aria-label="Attach files">
            <Paperclip className="size-4" /> {files.length ? files.join(", ") : "Attach files"} <span className="text-ink-4">(&lt; 40 MB)</span>
          </button>
          <span className="text-[11.5px] text-ink-4">
            <Kbd>⌘</Kbd> <Kbd>↵</Kbd> to send
          </span>
          <div className="ml-auto flex items-center gap-1.5">
            {kind === "reply" && status !== "resolved" && status !== "closed" && (
              <>
                <Button type="button" variant="ghost" size="sm" disabled={pending} onClick={() => formRef.current && submit(new FormData(formRef.current), "pending")}>Send &amp; wait for reply</Button>
                <Button type="button" variant="ghost" size="sm" disabled={pending} onClick={() => formRef.current && submit(new FormData(formRef.current), "resolved")}>Send &amp; resolve</Button>
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

function Tool({ label, onClick, children }: { label: string; onClick: () => void; children: React.ReactNode }) {
  return (
    <button type="button" title={label} aria-label={label} onClick={onClick} className="inline-flex size-7 items-center justify-center rounded-md text-ink-3 hover:bg-surface-2 hover:text-ink">
      {children}
    </button>
  );
}
