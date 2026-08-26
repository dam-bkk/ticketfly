import { saveTicketCustom } from "@/app/extra-actions";
import { Button } from "@/components/ui/button";
import { Input, Select, Textarea } from "@/components/ui/input";

type F = { id: number; key: string; label: string; type: string; options: string[]; required: boolean };

/** Field Manager fields rendered in the ticket properties panel. Values live in tickets.custom. */
export function CustomFields({ ticketId, fields, values }: { ticketId: number; fields: F[]; values: Record<string, string> }) {
  if (!fields.length) return null;
  return (
    <form action={saveTicketCustom.bind(null, ticketId)} className="space-y-2 px-5 py-4 hairline-t">
      <p className="label">Custom fields</p>
      {fields.map((f) => (
        <div key={f.id} className="grid grid-cols-[76px_1fr] items-center gap-2">
          <span className="truncate text-[12.5px] text-ink-3" title={f.label}>{f.label}</span>
          {f.type === "select" ? (
            <Select name={`cf_${f.key}`} defaultValue={values[f.key] ?? ""} className="h-8 text-[13px]">
              <option value="">—</option>
              {f.options.map((o) => <option key={o} value={o}>{o}</option>)}
            </Select>
          ) : f.type === "toggle" ? (
            <label className="flex h-8 items-center gap-2 text-[13px]"><input type="checkbox" name={`cf_${f.key}`} defaultChecked={values[f.key] === "Yes"} className="accent-[var(--accent)]" /> {values[f.key] === "Yes" ? "Yes" : "No"}</label>
          ) : f.type === "textarea" ? (
            <Textarea name={`cf_${f.key}`} defaultValue={values[f.key] ?? ""} className="min-h-16 text-[13px]" />
          ) : (
            <Input type={f.type === "date" ? "date" : "text"} name={`cf_${f.key}`} defaultValue={values[f.key] ?? ""} className="h-8 text-[13px]" />
          )}
        </div>
      ))}
      <div className="flex justify-end"><Button type="submit" size="sm" variant="secondary">Save</Button></div>
    </form>
  );
}
