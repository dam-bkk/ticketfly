"use client";

import { useState, useTransition } from "react";
import { Check, MessageSquareWarning } from "lucide-react";
import { decideApproval } from "@/app/module-actions";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/input";

/**
 * The signed-in approver's decision, rendered where the pending row is (Approvals rail) and,
 * as Approve only, inside the "Next: your approval" bar. "Request changes" records a rejection
 * with a note — the change drops back to Planning for the owner to revise and resubmit.
 */
export function ApprovalActions({ changeId, compact }: { changeId: number; compact?: boolean }) {
  const [pending, start] = useTransition();
  const [asking, setAsking] = useState(false);
  const [note, setNote] = useState("");
  const approve = () => start(() => decideApproval(changeId, "approved", undefined));
  const requestChanges = () => start(() => decideApproval(changeId, "rejected", note.trim() || undefined));

  if (compact) {
    return (
      <Button size="sm" variant="primary" disabled={pending} onClick={approve}>
        <Check className="size-3.5" /> Approve
      </Button>
    );
  }
  return (
    <div className="mt-3 space-y-2" aria-busy={pending}>
      {asking ? (
        <>
          <Textarea value={note} onChange={(e) => setNote(e.target.value)} autoFocus placeholder="What needs to change before you can approve?" className="min-h-20 resize-none text-[13px]" />
          <div className="flex items-center gap-1.5">
            <Button size="sm" variant="danger" disabled={pending || !note.trim()} onClick={requestChanges}>Send back</Button>
            <Button size="sm" variant="ghost" disabled={pending} onClick={() => setAsking(false)}>Cancel</Button>
          </div>
        </>
      ) : (
        <div className="flex items-center gap-1.5">
          <Button size="sm" variant="primary" disabled={pending} onClick={approve} className="flex-1">
            <Check className="size-3.5" /> Approve
          </Button>
          <Button size="sm" variant="secondary" disabled={pending} onClick={() => setAsking(true)} className="flex-1">
            <MessageSquareWarning className="size-3.5" /> Request changes
          </Button>
        </div>
      )}
      <p className="text-[11px] text-ink-3">Your decision is recorded with your name and time.</p>
    </div>
  );
}
