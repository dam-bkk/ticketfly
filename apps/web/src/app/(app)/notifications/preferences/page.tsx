import { saveNotifyPrefs } from "@/app/extra-actions";
import { requireStaff } from "@/lib/auth";
import { getPrefs } from "@/lib/modules";
import { Topbar } from "@/components/shell/topbar";
import { Button } from "@/components/ui/button";

export const metadata = { title: "Notification preferences" };

const KINDS: [string, string, string][] = [
  ["assignment", "Assigned to me", "A ticket, task or change lands on you"],
  ["sla", "SLA warnings", "75% of the allowance used, or breached"],
  ["task", "Tasks due", "Your tasks due today or overdue"],
  ["mention", "Mentions", "Someone @mentions you in a note"],
  ["approval", "Approvals", "A change needs your decision, or yours was decided"],
  ["change", "Change updates", "Changes you raised start, complete or roll back"],
  ["release", "Service Desk releases", "A new build is deployed"],
  ["reminder", "Requester reminders", "Waiting-on-requester reminders you sent"],
];
const DEFAULT = { inApp: true, email: true, teams: false };

export default async function PrefsPage() {
  const me = await requireStaff();
  const prefs = await getPrefs(me.id);
  return (
    <>
      <Topbar crumbs={[{ label: "Notifications", href: "/notifications" }, { label: "Preferences" }]} />
      <div className="flex-1 overflow-y-auto">
        <div className="mx-auto max-w-[760px] px-6 py-4 rise">
          <h1 className="text-[22px] font-semibold tracking-[-0.01em]">Notification preferences</h1>
          <p className="text-[13.5px] text-ink-3">Same list, three channels. Email uses the support mailbox; Teams arrives with the Servicebot phase.</p>
          <form action={saveNotifyPrefs} className="panel mt-3 overflow-hidden">
            <table className="w-full text-[13.5px]">
              <thead><tr className="text-left [&>th]:h-9 [&>th]:px-4"><th className="label">Event</th><th className="label text-center">In app</th><th className="label text-center">Email</th><th className="label text-center">Teams</th></tr></thead>
              <tbody>
                {KINDS.map(([k, label, desc]) => {
                  const v = prefs.notify[k] ?? DEFAULT;
                  return (
                    <tr key={k} className="hairline-t">
                      <td className="px-4 py-2"><span className="block font-medium">{label}</span><span className="text-[12.5px] text-ink-3">{desc}</span></td>
                      {(["inApp", "email", "teams"] as const).map((ch) => (
                        <td key={ch} className="px-4 py-2 text-center"><input type="checkbox" name={`${k}.${ch}`} defaultChecked={v[ch]} className="size-3.5 accent-[var(--accent)]" /></td>
                      ))}
                    </tr>
                  );
                })}
              </tbody>
            </table>
            <div className="flex justify-end px-4 py-2 hairline-t"><Button type="submit" variant="primary" size="sm">Save</Button></div>
          </form>
        </div>
      </div>
    </>
  );
}
