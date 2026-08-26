"use client";

import { useState, useTransition } from "react";
import { Check, Link2, MessageSquareReply } from "lucide-react";
import { closeTicket } from "@/app/actions";
import { Button } from "@/components/ui/button";

/** Freshservice's ticket header: Reply · Mark ticket as closed · Share — same three, same order. */
export function HeaderActions({ ticketId, status }: { ticketId: number; status: string }) {
  const [pending, start] = useTransition();
  const [copied, setCopied] = useState(false);
  return (
    <>
      <Button size="md" variant="secondary" onClick={() => document.querySelector<HTMLTextAreaElement>("textarea[name=body]")?.focus()}>
        <MessageSquareReply className="size-3.5" /> Reply
      </Button>
      {status !== "closed" && (
        <Button size="md" variant="secondary" disabled={pending} onClick={() => start(() => closeTicket(ticketId))}>
          <Check className="size-3.5" /> Mark ticket as closed
        </Button>
      )}
      <Button
        size="md"
        variant="secondary"
        onClick={() => {
          navigator.clipboard?.writeText(window.location.href);
          setCopied(true);
          setTimeout(() => setCopied(false), 1500);
        }}
      >
        <Link2 className="size-3.5" /> {copied ? "Link copied" : "Share"}
      </Button>
    </>
  );
}
