import { db, schema } from "@ticketfly/db";
import { asc } from "drizzle-orm";
import { Trash2 } from "lucide-react";
import { createField, deleteField } from "@/app/extra-actions";
import { requireStaff } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Field, Input, Select } from "@/components/ui/input";
import { Tone } from "@/components/ui/pills";

export const metadata = { title: "Field Manager" };

export default async function FieldsPage() {
  await requireStaff();
  const fields = await db.select().from(schema.customFields).orderBy(asc(schema.customFields.entity), asc(schema.customFields.position));
  return (
    <div className="max-w-3xl">
      <h1 className="text-[20px] font-semibold tracking-[-0.01em]">Field Manager</h1>
      <p className="text-[13px] text-ink-3">Custom fields shown in the ticket properties panel (and, optionally, only in one workspace). Values are stored per ticket and searchable.</p>
      <div className="panel mt-5 overflow-hidden">
        <table className="w-full text-[13px]">
          <thead><tr className="text-left [&>th]:h-9 [&>th]:px-4"><th className="label">Label</th><th className="label">Key</th><th className="label">Type</th><th className="label">Options</th><th className="label">Workspace</th><th className="label">Required</th><th /></tr></thead>
          <tbody>
            {fields.map((f) => (
              <tr key={f.id} className="hairline-t">
                <td className="px-4 py-2 font-medium">{f.label}</td>
                <td className="px-4 py-2 font-mono text-[12px] text-ink-3">{f.key}</td>
                <td className="px-4 py-2 capitalize text-ink-2">{f.type}</td>
                <td className="px-4 py-2 text-ink-3">{f.options.join(", ") || "—"}</td>
                <td className="px-4 py-2">{f.workspace ? <Tone tone="info">{f.workspace}</Tone> : <span className="text-ink-3">all</span>}</td>
                <td className="px-4 py-2 text-ink-3">{f.required ? "yes" : "no"}</td>
                <td className="px-2 py-2 text-right">
                  <form action={deleteField.bind(null, f.id)}>
                    <button type="submit" aria-label="Delete field" className="rounded p-1 text-ink-3 hover:bg-crit-soft hover:text-crit"><Trash2 className="size-3.5" /></button>
                  </form>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <form action={createField} className="panel mt-4 space-y-3 p-4">
        <p className="text-[13px] font-medium">Add a field</p>
        <div className="grid gap-3 sm:grid-cols-4">
          <Field label="Label" required><Input name="label" required placeholder="Cost centre" /></Field>
          <Field label="Type"><Select name="type" defaultValue="text"><option value="text">Text</option><option value="textarea">Long text</option><option value="select">Dropdown</option><option value="date">Date</option><option value="toggle">Yes / No</option></Select></Field>
          <Field label="Options (dropdown)" help="Comma-separated"><Input name="options" placeholder="A, B, C" /></Field>
          <Field label="Workspace"><Select name="workspace" defaultValue=""><option value="">All</option><option value="it">IT Division</option><option value="finance">Finance</option><option value="pwr">Project Work Request</option><option value="globalops">Global Operation</option><option value="sip">Strategic Initiatives Portal</option></Select></Field>
        </div>
        <label className="flex items-center gap-2 text-[13px]"><input type="checkbox" name="required" className="accent-[var(--accent)]" /> Required on new tickets</label>
        <input type="hidden" name="entity" value="ticket" />
        <div className="flex justify-end"><Button type="submit" variant="primary" size="sm">Add field</Button></div>
      </form>
    </div>
  );
}
