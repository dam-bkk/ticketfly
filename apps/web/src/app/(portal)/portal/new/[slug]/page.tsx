import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, Clock } from "lucide-react";
import { createRequest } from "@/app/actions";
import { requirePrincipal } from "@/lib/auth";
import { getService, listPeopleForPicker } from "@/lib/queries";
import { Field, Input, Select, Textarea, Toggle } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { ServiceIcon } from "../../icons";
import { PersonPicker } from "./person-picker";

export default async function NewRequest({ params, searchParams }: { params: Promise<{ slug: string }>; searchParams: Promise<{ q?: string }> }) {
  const me = await requirePrincipal();
  const { slug } = await params;
  const { q } = await searchParams;
  const service = await getService(slug);
  if (!service) notFound();
  const people = service.fields.some((f) => f.type === "person") ? await listPeopleForPicker() : [];
  const firstText = service.fields.find((f) => f.type === "textarea" || f.type === "text");

  return (
    <div className="mx-auto max-w-2xl pt-10 rise">
      <Link href="/portal" className="inline-flex items-center gap-1.5 text-[13px] text-ink-3 hover:text-ink">
        <ArrowLeft className="size-3.5" /> Back
      </Link>
      <div className="mt-6 flex items-start gap-4">
        <span className="flex size-12 shrink-0 items-center justify-center rounded-xl bg-accent-soft text-accent-ink">
          <ServiceIcon name={service.icon} className="size-6" />
        </span>
        <div>
          <h1 className="text-[26px] font-semibold tracking-[-0.015em]" style={{ textWrap: "balance" }}>
            {service.name}
          </h1>
          <p className="text-[14px] text-ink-2">{service.tagline}</p>
          {service.eta && (
            <p className="mt-2 inline-flex items-center gap-1.5 text-[12.5px] text-ink-3">
              <Clock className="size-3.5" /> {service.eta}
            </p>
          )}
        </div>
      </div>

      <form action={createRequest.bind(null, service.slug)} className="mt-8 space-y-5 rounded-2xl bg-surface p-6 shadow-1 hairline">
        {service.fields.map((f) => {
          const prefill = f.key === firstText?.key && q ? q : undefined;
          switch (f.type) {
            case "textarea":
              return (
                <Field key={f.key} label={f.label} help={f.help} required={f.required}>
                  <Textarea name={f.key} required={f.required} defaultValue={prefill} placeholder="Plain words are perfect." />
                </Field>
              );
            case "select":
              return (
                <Field key={f.key} label={f.label} help={f.help} required={f.required}>
                  <Select name={f.key} required={f.required} defaultValue="">
                    <option value="" disabled>
                      Choose…
                    </option>
                    {f.options?.map((o) => (
                      <option key={o} value={o}>
                        {o}
                      </option>
                    ))}
                  </Select>
                </Field>
              );
            case "date":
              return (
                <Field key={f.key} label={f.label} help={f.help} required={f.required}>
                  <Input type="date" name={f.key} required={f.required} className="w-56" />
                </Field>
              );
            case "person":
              return (
                <Field key={f.key} label={f.label} help={f.help} required={f.required}>
                  <PersonPicker name={f.key} people={people} required={f.required} exclude={me.id} />
                </Field>
              );
            case "toggle":
              return <Toggle key={f.key} name={f.key} label={f.label} />;
            default:
              return (
                <Field key={f.key} label={f.label} help={f.help} required={f.required}>
                  <Input name={f.key} required={f.required} defaultValue={prefill} />
                </Field>
              );
          }
        })}
        <div className="flex items-center justify-between pt-2">
          <p className="text-[12px] text-ink-3">
            Raised as <strong className="font-medium text-ink-2">{me.displayName}</strong> · you will get an email when it is picked up.
          </p>
          <Button type="submit" variant="primary" size="lg">
            Send request
          </Button>
        </div>
      </form>

      {service.kind === "onboarding" && (
        <div className="mt-6 rounded-xl bg-accent-soft/60 p-5 text-[13px] leading-relaxed text-ink-2">
          <p className="font-medium text-ink">What happens next</p>
          <ol className="mt-2 list-decimal space-y-1 pl-5">
            <li>IT clones the access of the colleague you picked and shows you the list for approval.</li>
            <li>The account, licences and laptop are ready five working days before the start date.</li>
            <li>On day one your new colleague activates their profile and receives the welcome pack.</li>
          </ol>
        </div>
      )}
    </div>
  );
}
