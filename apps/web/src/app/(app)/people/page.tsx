import Link from "next/link";
import { requireStaff } from "@/lib/auth";
import { listPeople } from "@/lib/queries";
import { cn, money } from "@/lib/utils";
import { Topbar } from "@/components/shell/topbar";
import { Avatar } from "@/components/ui/avatar";
import { Tone } from "@/components/ui/pills";

export const metadata = { title: "People" };

export default async function PeoplePage({ searchParams }: { searchParams: Promise<{ q?: string; status?: string }> }) {
  await requireStaff();
  const sp = await searchParams;
  const rows = await listPeople({ q: sp.q, status: sp.status });
  return (
    <>
      <Topbar crumbs={[{ label: "People" }]} />
      <div className="flex-1 overflow-y-auto">
        <div className="mx-auto max-w-[1180px] px-6 py-6 rise">
          <div className="flex items-end justify-between">
            <div>
              <h1 className="text-[20px] font-semibold tracking-[-0.01em]">People</h1>
              <p className="text-[13px] text-ink-3">Every person&apos;s devices, access grants and what they cost per month — the record offboarding reverses.</p>
            </div>
            <div className="flex items-center gap-2">
              <form>
                <input name="q" defaultValue={sp.q} placeholder="Search name, email, department" className="h-8 w-64 rounded-md bg-surface px-3 text-[13px] hairline focus:outline-none focus:shadow-[inset_0_0_0_1px_var(--accent),0_0_0_3px_var(--ring)]" />
              </form>
              <div className="flex gap-1">
                {["", "onboarding", "offboarding", "active"].map((s) => (
                  <Link key={s || "all"} href={`/people${s ? `?status=${s}` : ""}`} className={cn("h-8 rounded-md px-2.5 text-[12.5px] font-medium capitalize leading-8 text-ink-2 hover:bg-surface-2", (sp.status ?? "") === s && "bg-surface-2 text-ink")}>
                    {s || "All"}
                  </Link>
                ))}
              </div>
            </div>
          </div>
          <div className="panel mt-5 overflow-hidden">
            <table className="w-full text-[13px]">
              <thead>
                <tr className="text-left [&>th]:h-9 [&>th]:px-3">
                  <th className="label">Person</th>
                  <th className="label">Department</th>
                  <th className="label">Office</th>
                  <th className="label">Status</th>
                  <th className="label text-right">Devices</th>
                  <th className="label text-right">Access</th>
                  <th className="label text-right">Monthly cost</th>
                  <th className="label text-right">Open tickets</th>
                </tr>
              </thead>
              <tbody>
                {rows.map(({ p, devices, grants, monthly, openTickets }) => (
                  <tr key={p.id} className="row hairline-t">
                    <td className="px-3 py-2">
                      <Link href={`/people/${p.id}`} className="flex items-center gap-2.5">
                        <Avatar name={p.displayName} size={26} />
                        <span className="min-w-0">
                          <span className="block truncate font-medium hover:underline">{p.displayName}</span>
                          <span className="block truncate text-[11.5px] text-ink-3">{p.jobTitle}</span>
                        </span>
                      </Link>
                    </td>
                    <td className="px-3 py-2 text-ink-2">{p.department}</td>
                    <td className="px-3 py-2 text-ink-2">{p.officeLocation}</td>
                    <td className="px-3 py-2">
                      {p.status === "onboarding" ? <Tone tone="info">Joins {p.joinDate}</Tone> : p.status === "offboarding" ? <Tone tone="warn">Leaves {p.leaveDate}</Tone> : p.status === "left" ? <Tone tone="neutral">Left</Tone> : <span className="capitalize text-ink-3">{p.role}</span>}
                    </td>
                    <td className="tnum px-3 py-2 text-right">{devices}</td>
                    <td className="tnum px-3 py-2 text-right">{grants || "—"}</td>
                    <td className="tnum px-3 py-2 text-right text-ink-2">{monthly ? money(monthly) : "—"}</td>
                    <td className="tnum px-3 py-2 text-right text-ink-2">{openTickets || "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </>
  );
}
