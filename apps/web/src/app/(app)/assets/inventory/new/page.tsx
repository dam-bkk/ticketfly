import { createAsset } from "@/app/module-actions";
import { requireStaff } from "@/lib/auth";
import { listPickers } from "@/lib/assets";
import { Topbar } from "@/components/shell/topbar";
import { Button } from "@/components/ui/button";
import { Field, Input, Select } from "@/components/ui/input";

export const metadata = { title: "Add asset" };

export default async function NewAsset() {
  await requireStaff();
  const { people } = await listPickers();
  return (
    <>
      <Topbar crumbs={[{ label: "Assets" }, { label: "Inventory", href: "/assets/inventory" }, { label: "Add New" }]} />
      <div className="flex-1 overflow-y-auto">
        <form action={createAsset} className="mx-auto max-w-2xl px-6 py-6 rise">
          <h1 className="text-[20px] font-semibold tracking-[-0.01em]">Add asset</h1>
          <p className="text-[13px] text-ink-3">For what discovery cannot see — monitors, peripherals, spare stock. Laptops and phones arrive from Intune on their own. The tag is generated.</p>
          <div className="panel mt-5 space-y-4 p-5">
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Asset type" required>
                <Select name="type" defaultValue="monitor">
                  {["laptop", "desktop", "mobile", "tablet", "monitor", "peripheral", "server"].map((t) => <option key={t} value={t}>{t[0]!.toUpperCase() + t.slice(1)}</option>)}
                </Select>
              </Field>
              <Field label="Model" required><Input name="model" required placeholder="Dell U2724D" /></Field>
              <Field label="Serial"><Input name="serial" /></Field>
              <Field label="Vendor"><Input name="vendor" /></Field>
              <Field label="Location">
                <Select name="location" defaultValue="Hong Kong">{["Hong Kong", "Kuala Lumpur", "Singapore", "Dubai", "Bangkok", "Manila"].map((c) => <option key={c}>{c}</option>)}</Select>
              </Field>
              <Field label="Impact">
                <Select name="impact" defaultValue="low">{["low", "medium", "high"].map((v) => <option key={v} value={v}>{v[0]!.toUpperCase() + v.slice(1)}</option>)}</Select>
              </Field>
              <Field label="Purchase date"><Input type="date" name="purchaseDate" /></Field>
              <Field label="Cost (USD)"><Input type="number" step="0.01" name="cost" /></Field>
            </div>
            <Field label="Assign to" help="Leave empty to put it in stock. Assigning notifies the person to acknowledge it in the portal.">
              <Select name="ownerId" defaultValue="">
                <option value="">— stock —</option>
                {people.filter((p) => p.status === "active").map((p) => <option key={p.id} value={p.id}>{p.displayName}{p.department ? ` · ${p.department}` : ""}</option>)}
              </Select>
            </Field>
            <Field label="Department"><Input name="department" /></Field>
          </div>
          <div className="mt-5 flex justify-end"><Button type="submit" variant="primary" size="lg">Add asset</Button></div>
        </form>
      </div>
    </>
  );
}
