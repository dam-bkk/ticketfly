import { requireStaff } from "@/lib/auth";
import { listJobs } from "@/lib/queries";
import { cn, relTime } from "@/lib/utils";
import { Button } from "@/components/ui/button";

export const metadata = { title: "Integrations" };

export default async function IntegrationsPage() {
  await requireStaff();
  const jobs = await listJobs();
  const job = (n: string) => jobs.find((j) => j.name === n);
  const items = [
    { name: "Microsoft Entra ID", what: "Sign-in, app roles, user and group provisioning for joiners and leavers", perms: ["User.ReadWrite.All", "Group.ReadWrite.All", "LicenseAssignment.ReadWrite.All", "Organization.Read.All"], status: "connected", last: null as Date | null },
    { name: "Microsoft Graph · Mail", what: "support@ inbox → tickets; replies sent from the shared mailbox", perms: ["Mail.ReadWrite (application access policy)", "Mail.Send"], status: "connected", last: job("mail-poll")?.lastRunAt ?? null },
    { name: "Intune", what: "Managed devices, hardware detail, compliance state", perms: ["DeviceManagementManagedDevices.Read.All"], status: "connected", last: job("intune-sync")?.lastRunAt ?? null },
    { name: "Defender for Endpoint", what: "Software inventory per device, vulnerabilities, unlicensed installs", perms: ["Machine.Read.All", "Software.Read.All", "Vulnerability.Read.All"], status: "connected", last: job("defender-sync")?.lastRunAt ?? null },
    { name: "Log Analytics", what: "Last-seen location per device from SigninLogs and DeviceInfo", perms: ["Data.Read", "Reader on workspace"], status: "warning", last: job("loganalytics-location")?.lastRunAt ?? null },
    { name: "Freshservice (import)", what: "One-off historical import · 210 tickets, conversations and attachments", perms: ["API key (Key Vault)"], status: "archived", last: new Date("2026-08-20T02:00:00Z") },
  ];
  return (
    <div className="max-w-3xl">
      <h1 className="text-[20px] font-semibold tracking-[-0.01em]">Integrations</h1>
      <p className="text-[13px] text-ink-3">One app registration per environment, application permissions at least privilege, certificate credential in Key Vault.</p>
      <div className="mt-6 space-y-3">
        {items.map((it) => (
          <article key={it.name} className="panel flex items-start gap-4 p-5">
            <span className={cn("mt-1.5 size-2 shrink-0 rounded-full", it.status === "connected" ? "bg-ok" : it.status === "warning" ? "bg-warn" : "bg-ink-4")} />
            <div className="min-w-0 flex-1">
              <div className="flex items-baseline gap-2">
                <h2 className="text-[14px] font-semibold">{it.name}</h2>
                <span className="text-[12px] text-ink-3">{it.last ? `synced ${relTime(it.last)}` : "no sync yet"}</span>
              </div>
              <p className="mt-0.5 text-[13px] text-ink-2">{it.what}</p>
              <div className="mt-2 flex flex-wrap gap-1">
                {it.perms.map((p) => (
                  <span key={p} className="rounded bg-surface-2 px-1.5 py-0.5 font-mono text-[10.5px] text-ink-3">
                    {p}
                  </span>
                ))}
              </div>
            </div>
            <Button size="sm" type="button">
              {it.status === "archived" ? "View import" : "Configure"}
            </Button>
          </article>
        ))}
      </div>
    </div>
  );
}
