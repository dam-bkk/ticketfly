import { requireStaff } from "@/lib/auth";
import { listSlaPolicies } from "@/lib/queries";
import { minutesLabel, PRIORITY_LABEL } from "@/lib/utils";
import { PriorityMark } from "@/components/ui/pills";
import { Button } from "@/components/ui/button";

export const metadata = { title: "Service levels" };

export default async function SlaPage() {
  await requireStaff();
  const policies = await listSlaPolicies();
  return (
    <div className="max-w-3xl">
      <h1 className="text-[20px] font-semibold tracking-[-0.01em]">Service levels</h1>
      <p className="text-[13px] text-ink-3">Targets per priority. Clocks pause while a ticket waits on the requester or is on hold; “at risk” starts at 75 % of the allowance.</p>
      <div className="panel mt-6 overflow-hidden">
        <table className="w-full text-[13px]">
          <thead>
            <tr className="text-left [&>th]:h-9 [&>th]:px-4">
              <th className="label">Priority</th>
              <th className="label">First response</th>
              <th className="label">Resolution</th>
              <th className="label">Clock</th>
              <th className="label">Escalation</th>
            </tr>
          </thead>
          <tbody>
            {policies.map((p) => (
              <tr key={p.id} className="hairline-t">
                <td className="px-4 py-3">
                  <PriorityMark priority={p.priority} withLabel />
                </td>
                <td className="tnum px-4 py-3 font-medium">{minutesLabel(p.firstResponseMinutes)}</td>
                <td className="tnum px-4 py-3 font-medium">{minutesLabel(p.resolutionMinutes)}</td>
                <td className="px-4 py-3 text-ink-2">{p.calendarHours ? "24 × 7 calendar hours" : "Business hours"}</td>
                <td className="px-4 py-3 text-ink-3">{p.priority === "urgent" ? "Notify Head of IT at 50 %" : p.priority === "high" ? "Notify team lead at 75 %" : "Assignee reminder at 75 %"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="mt-6 grid gap-4 md:grid-cols-2">
        <div className="panel p-5">
          <h2 className="text-[14px] font-semibold">Priority matrix</h2>
          <p className="mt-0.5 text-[12.5px] text-ink-3">Impact × urgency → priority, applied when a requester submits from the portal.</p>
          <table className="mt-3 w-full text-center text-[12.5px]">
            <thead>
              <tr>
                <th className="label text-left">Impact ↓ · Urgency →</th>
                <th className="label">Low</th>
                <th className="label">Medium</th>
                <th className="label">High</th>
              </tr>
            </thead>
            <tbody>
              {[
                ["High", ["medium", "high", "urgent"]],
                ["Medium", ["low", "medium", "high"]],
                ["Low", ["low", "low", "medium"]],
              ].map(([label, cells]) => (
                <tr key={label as string}>
                  <td className="py-1.5 text-left text-ink-2">{label as string}</td>
                  {(cells as string[]).map((c, i) => (
                    <td key={i} className="py-1.5">
                      <span className="inline-flex items-center gap-1.5 rounded-md bg-surface-2 px-2 py-0.5">
                        <PriorityMark priority={c} /> {PRIORITY_LABEL[c]}
                      </span>
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="panel p-5">
          <h2 className="text-[14px] font-semibold">Pause conditions</h2>
          <ul className="mt-3 space-y-2 text-[13px]">
            {["Status is Waiting on requester", "Status is On hold (third party)", "Outside business hours (unless 24 × 7)", "Public holiday in the workspace calendar"].map((s) => (
              <li key={s} className="flex items-center gap-2">
                <span className="size-1.5 rounded-full bg-ink-4" /> {s}
              </li>
            ))}
          </ul>
          <Button className="mt-4" type="button">
            Edit policies
          </Button>
        </div>
      </div>
    </div>
  );
}
