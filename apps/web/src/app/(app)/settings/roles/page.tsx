import { Check, Minus } from "lucide-react";
import { requireStaff } from "@/lib/auth";

export const metadata = { title: "Roles & permissions" };

const ROLES = ["Requester", "Manager", "Agent", "HR", "Admin"];
const MATRIX: [string, (0 | 1 | 2)[]][] = [
  ["Raise requests and see own tickets", [1, 1, 1, 1, 1]],
  ["See team members' tickets", [0, 1, 1, 0, 1]],
  ["Approve access requests for direct reports", [0, 1, 0, 0, 1]],
  ["Work the inbox, reply, assign, resolve", [0, 0, 1, 0, 1]],
  ["View people, devices and access grants", [0, 0, 1, 1, 1]],
  ["Raise joiners and leavers", [0, 1, 1, 1, 1]],
  ["Clone access from a colleague", [0, 0, 1, 0, 1]],
  ["Edit SLA policies, catalogue, integrations", [0, 0, 0, 0, 1]],
  ["Read the activity log", [0, 0, 2, 2, 1]],
  ["Export data", [0, 0, 0, 0, 1]],
];

export default async function RolesPage() {
  await requireStaff();
  return (
    <div className="max-w-3xl">
      <h1 className="text-[20px] font-semibold tracking-[-0.01em]">Roles &amp; permissions</h1>
      <p className="text-[13px] text-ink-3">Roles arrive in the Entra ID token as app roles and map to this matrix. Security groups are assigned to app roles by IT — nothing here is hard-coded to a group ID.</p>
      <div className="panel mt-6 overflow-hidden">
        <table className="w-full text-[13px]">
          <thead>
            <tr className="[&>th]:h-9 [&>th]:px-4">
              <th className="label text-left">Capability</th>
              {ROLES.map((r) => (
                <th key={r} className="label text-center">
                  {r}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {MATRIX.map(([cap, cells]) => (
              <tr key={cap} className="hairline-t">
                <td className="px-4 py-2.5 text-ink-2">{cap}</td>
                {cells.map((c, i) => (
                  <td key={i} className="px-4 py-2.5 text-center">
                    {c === 1 ? <Check className="mx-auto size-4 text-ok" strokeWidth={2.5} /> : c === 2 ? <span className="text-[11px] text-ink-3">own scope</span> : <Minus className="mx-auto size-3.5 text-ink-4" />}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="mt-6 grid gap-4 md:grid-cols-2">
        <div className="panel p-5">
          <h2 className="text-[14px] font-semibold">Entra app roles</h2>
          <ul className="mt-3 space-y-1.5 font-mono text-[12px] text-ink-2">
            {["TicketFly.Requester", "TicketFly.Manager", "TicketFly.Agent", "TicketFly.HR", "TicketFly.Admin"].map((r) => (
              <li key={r}>{r}</li>
            ))}
          </ul>
        </div>
        <div className="panel p-5">
          <h2 className="text-[14px] font-semibold">Row-level rules</h2>
          <ul className="mt-3 space-y-1.5 text-[13px] text-ink-2">
            <li>Requesters see only tickets they raised or were CC&apos;d on.</li>
            <li>Managers additionally see tickets from direct reports.</li>
            <li>HR sees people records and joiner/leaver plans, not the IT inbox.</li>
            <li>Internal notes are never shown outside Agent and Admin.</li>
          </ul>
        </div>
      </div>
    </div>
  );
}
