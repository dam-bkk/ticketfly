import { APP_ENV, APP_VERSION, requireStaff } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Field, Input, Select, Toggle } from "@/components/ui/input";

export const metadata = { title: "Settings" };

export default async function General() {
  await requireStaff();
  return (
    <div className="max-w-2xl">
      <h1 className="text-[20px] font-semibold tracking-[-0.01em]">General</h1>
      <p className="text-[13px] text-ink-3">Workspace identity, business hours and the support mailbox.</p>

      <form className="mt-6 space-y-6">
        <Section title="Workspace">
          <Field label="Name">
            <Input defaultValue="IT QI Group" />
          </Field>
          <Field label="Support mailbox" help="Inbound mail becomes tickets; replies go out from this address via Microsoft Graph.">
            <Input defaultValue="support@qigroup.com" />
          </Field>
          <Field label="Ticket reference prefix">
            <Input defaultValue="TF" className="w-32 font-mono" />
          </Field>
        </Section>
        <Section title="Business hours" description="SLA clocks only tick inside these hours unless a policy is set to calendar hours.">
          <div className="grid grid-cols-3 gap-3">
            <Field label="Time zone">
              <Select defaultValue="Asia/Hong_Kong">
                <option>Asia/Hong_Kong</option>
                <option>Asia/Kuala_Lumpur</option>
                <option>Asia/Singapore</option>
                <option>Asia/Dubai</option>
              </Select>
            </Field>
            <Field label="Opens">
              <Input type="time" defaultValue="09:00" />
            </Field>
            <Field label="Closes">
              <Input type="time" defaultValue="18:00" />
            </Field>
          </div>
          <Field label="Working days">
            <div className="flex gap-1">
              {["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].map((d, i) => (
                <label key={d} className="cursor-pointer">
                  <input type="checkbox" defaultChecked={i < 5} className="peer sr-only" />
                  <span className="block h-8 w-12 rounded-md text-center text-[12.5px] leading-8 text-ink-3 hairline peer-checked:bg-accent-soft peer-checked:text-accent-ink peer-checked:font-medium">{d}</span>
                </label>
              ))}
            </div>
          </Field>
          <Field label="Holiday calendar">
            <Select defaultValue="hk">
              <option value="hk">Hong Kong public holidays 2026</option>
              <option value="my">Malaysia public holidays 2026</option>
            </Select>
          </Field>
        </Section>
        <Section title="Requester experience">
          <div className="space-y-2">
            <Toggle name="csat" label="Ask for a satisfaction rating when a ticket is closed" defaultChecked />
            <Toggle name="autoclose" label="Close resolved tickets automatically after 3 days without reply" defaultChecked />
            <Toggle name="kb" label="Suggest knowledge articles while typing a request" />
          </div>
        </Section>
        <div className="flex items-center gap-3">
          <Button type="button" variant="primary">
            Save changes
          </Button>
          <span className="font-mono text-[11.5px] text-ink-3">
            v{APP_VERSION} · {APP_ENV}
          </span>
        </div>
      </form>
    </div>
  );
}

function Section({ title, description, children }: { title: string; description?: string; children: React.ReactNode }) {
  return (
    <section className="panel p-5">
      <h2 className="text-[14px] font-semibold">{title}</h2>
      {description && <p className="mt-0.5 text-[12.5px] text-ink-3">{description}</p>}
      <div className="mt-4 space-y-4">{children}</div>
    </section>
  );
}
