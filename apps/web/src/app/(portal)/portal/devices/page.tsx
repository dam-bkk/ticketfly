import { Laptop, Monitor, Smartphone, Tablet, Keyboard, ShieldCheck } from "lucide-react";
import { acknowledgeDevice, reportReturned } from "@/app/asset-actions";
import { requirePrincipal } from "@/lib/auth";
import { myDevices } from "@/lib/assets";
import { cn, longTime, relTime } from "@/lib/utils";
import { Button } from "@/components/ui/button";

export const metadata = { title: "My devices" };

const ICON: Record<string, React.ReactNode> = { laptop: <Laptop className="size-5" />, desktop: <Monitor className="size-5" />, mobile: <Smartphone className="size-5" />, tablet: <Tablet className="size-5" />, monitor: <Monitor className="size-5" />, peripheral: <Keyboard className="size-5" /> };

export default async function MyDevices() {
  const me = await requirePrincipal();
  const devices = await myDevices(me.id);
  const pending = devices.filter((d) => !d.acknowledgedAt && !d.returnedAt);
  return (
    <div className="mx-auto max-w-2xl pt-10 rise">
      <h1 className="text-[26px] font-semibold tracking-[-0.015em]">My devices</h1>
      <p className="text-[14px] text-ink-3">What IT has recorded against your name. If something is missing or you no longer have it, say so here — it updates the inventory directly.</p>
      {pending.length > 0 && (
        <div className="mt-5 rounded-xl bg-accent-soft/70 px-4 py-3 text-[13.5px] text-ink">
          <strong className="font-medium">{pending.length} device{pending.length > 1 ? "s" : ""} to acknowledge.</strong> Confirming tells IT the handover is complete and starts the warranty clock on your side.
        </div>
      )}
      <ul className="mt-6 space-y-3">
        {devices.length === 0 && <li className="rounded-xl bg-surface p-6 text-[13.5px] text-ink-3 hairline">No devices are assigned to you. If you have company equipment, ask IT to record it.</li>}
        {devices.map((d) => {
          const returned = !!d.returnedAt;
          const acked = !!d.acknowledgedAt;
          return (
            <li key={d.id} className={cn("rounded-2xl bg-surface p-5 hairline", returned && "opacity-75")}>
              <div className="flex items-start gap-4">
                <span className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-surface-2 text-ink-2">{ICON[d.type]}</span>
                <div className="min-w-0 flex-1">
                  <p className="text-[15px] font-semibold tracking-[-0.01em]">{d.model ?? d.name}</p>
                  <p className="text-[12.5px] text-ink-3">
                    <span className="font-mono">{d.assetTag}</span> · {d.serial} {d.os ? `· ${d.os} ${d.osVersion ?? ""}` : ""}
                  </p>
                  <p className="mt-2 text-[12.5px] text-ink-2">
                    {d.assignedOn ? `Assigned to you ${longTime(d.assignedOn)}` : "Assigned to you"}
                    {d.lastSeenAt && ` · last seen ${relTime(d.lastSeenAt)} in ${d.lastSeenCity}`}
                  </p>
                  <div className="mt-3 flex flex-wrap items-center gap-2">
                    {returned ? (
                      <span className="inline-flex h-7 items-center rounded-md bg-warn-soft px-2.5 text-[12.5px] font-medium text-warn">You reported this returned {relTime(d.returnedAt!)} — IT will unassign it</span>
                    ) : acked ? (
                      <span className="inline-flex h-7 items-center gap-1.5 rounded-md bg-ok-soft px-2.5 text-[12.5px] font-medium text-ok">
                        <ShieldCheck className="size-3.5" /> Acknowledged {relTime(d.acknowledgedAt!)}
                      </span>
                    ) : (
                      <form action={acknowledgeDevice.bind(null, d.id)}>
                        <Button type="submit" variant="primary" size="sm">
                          Yes, I have this device
                        </Button>
                      </form>
                    )}
                    {!returned && (
                      <form action={reportReturned.bind(null, d.id)}>
                        <Button type="submit" variant="ghost" size="sm">
                          I no longer have it
                        </Button>
                      </form>
                    )}
                    {d.compliance === "non_compliant" && <span className="ml-auto text-[12px] text-crit">Needs an update — IT will contact you</span>}
                  </div>
                </div>
              </div>
            </li>
          );
        })}
      </ul>
      <p className="mt-8 text-[12px] text-ink-3">Device list comes from Intune automatically. Acknowledgements and returns are written to the asset's assignment history, which IT sees on the same record.</p>
    </div>
  );
}
