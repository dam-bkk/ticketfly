import { requireStaff } from "@/lib/auth";
import { listPurchaseOrders } from "@/lib/assets";
import { money } from "@/lib/utils";
import { Topbar } from "@/components/shell/topbar";
import { Avatar } from "@/components/ui/avatar";
import { Tone } from "@/components/ui/pills";

export const metadata = { title: "Purchase Orders" };

export default async function PurchaseOrdersPage() {
  await requireStaff();
  const rows = await listPurchaseOrders();
  return (
    <>
      <Topbar crumbs={[{ label: "Assets" }, { label: "Purchase Orders" }]} />
      <div className="flex-1 overflow-y-auto">
        <div className="mx-auto max-w-[1180px] px-6 py-6 rise">
          <h1 className="text-[20px] font-semibold tracking-[-0.01em]">Purchase Orders</h1>
          <p className="text-[13px] text-ink-3">Hardware and licence orders; received items become inventory records automatically.</p>
          <div className="panel mt-5 overflow-hidden">
            <table className="w-full text-[13px]">
              <thead>
                <tr className="text-left [&>th]:h-9 [&>th]:px-3">
                  <th className="label">PO</th>
                  <th className="label">Vendor</th>
                  <th className="label">Items</th>
                  <th className="label">Status</th>
                  <th className="label">Ordered</th>
                  <th className="label">Expected</th>
                  <th className="label text-right">Total</th>
                  <th className="label">Requester</th>
                </tr>
              </thead>
              <tbody>
                {rows.map(({ p, requester }) => (
                  <tr key={p.id} className="row hairline-t">
                    <td className="px-3 py-2 font-mono text-[12.5px] font-medium text-accent-ink">{p.number}</td>
                    <td className="px-3 py-2 text-ink-2">{p.vendor}</td>
                    <td className="px-3 py-2 text-ink-2">{p.items.map((i) => `${i.qty}× ${i.name}`).join(", ")}</td>
                    <td className="px-3 py-2">
                      <Tone tone={p.status === "received" ? "ok" : p.status === "ordered" ? "info" : "warn"} className="capitalize">
                        {p.status.replace("_", " ")}
                      </Tone>
                    </td>
                    <td className="tnum px-3 py-2 text-ink-2">{p.orderedAt}</td>
                    <td className="tnum px-3 py-2 text-ink-2">{p.receivedAt ? <span className="text-ok">{p.receivedAt}</span> : p.expectedAt ?? "—"}</td>
                    <td className="tnum px-3 py-2 text-right font-medium">{money(p.total, p.currency)}</td>
                    <td className="px-3 py-2">{requester ? <span className="flex items-center gap-2"><Avatar name={requester} size={20} />{requester}</span> : "—"}</td>
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
