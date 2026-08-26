"use client";

import { useTransition } from "react";
import { closeTicket, updateTicket } from "@/app/actions";
import { Button } from "@/components/ui/button";
import { NextStep } from "@/components/ui/record";

/**
 * "Next: …" for a ticket — the same slim bar problems and changes already use.
 * One sentence about what the current status is waiting for, and the single relevant action inline.
 */
export function TicketNextStep({ ticketId, status, assigneeId, meId, requesterFirst }: { ticketId: number; status: string; assigneeId: number | null; meId: number; requesterFirst: string }) {
  const [pending, start] = useTransition();
  const act = (fn: () => Promise<unknown>) => start(async () => { await fn(); });

  const step =
    status === "open" && !assigneeId
      ? { label: "assign an agent", hint: "Unassigned tickets are not on anyone's list.", action: <Button size="sm" variant="primary" disabled={pending} onClick={() => act(() => updateTicket(ticketId, { assigneeId: meId }))}>Assign to me</Button> }
      : status === "open"
        ? { label: "start work", hint: "Assigned but not picked up — the response clock is running.", action: <Button size="sm" variant="primary" disabled={pending} onClick={() => act(() => updateTicket(ticketId, { status: "in_progress" }))}>Start work</Button> }
        : status === "in_progress"
          ? { label: "reply or resolve", hint: `Use “Send & wait for reply” if you need ${requesterFirst} to answer.`, action: null }
          : status === "pending"
            ? { label: "waiting on requester", hint: "SLA clocks are paused; the ticket reopens when they reply.", action: null }
            : status === "pending_approval"
              ? { label: "waiting for approval", hint: "Nothing to do until the approver decides.", action: null }
              : status === "on_hold"
                ? { label: "waiting on a third party", hint: "Resume when the vendor or supplier comes back.", action: <Button size="sm" variant="secondary" disabled={pending} onClick={() => act(() => updateTicket(ticketId, { status: "in_progress" }))}>Resume</Button> }
                : status === "resolved"
                  ? { label: "closes automatically after 3 days unless reopened", hint: `${requesterFirst} can reopen by replying.`, action: <Button size="sm" variant="secondary" disabled={pending} onClick={() => act(() => closeTicket(ticketId))}>Close now</Button> }
                  : status === "closed"
                    ? { label: "nothing — closed", hint: "Reopen if the requester comes back on the same issue.", action: <Button size="sm" variant="secondary" disabled={pending} onClick={() => act(() => updateTicket(ticketId, { status: "open" }))}>Reopen</Button> }
                    : null;

  if (!step) return null;
  return (
    <div className="shrink-0 px-8 pb-4" aria-busy={pending}>
      <NextStep label={step.label} hint={step.hint}>{step.action}</NextStep>
    </div>
  );
}
