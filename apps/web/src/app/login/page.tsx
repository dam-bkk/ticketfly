import { db, schema } from "@ticketfly/db";
import { inArray } from "drizzle-orm";
import { signInAs } from "@/app/actions";
import { Avatar } from "@/components/ui/avatar";
import { Logo } from "@/components/ui/logo";

export const metadata = { title: "Sign in" };

export default async function Login() {
  const personas = await db
    .select({ id: schema.people.id, displayName: schema.people.displayName, jobTitle: schema.people.jobTitle, role: schema.people.role, department: schema.people.department })
    .from(schema.people)
    .where(inArray(schema.people.displayName, ["Nada Haddad", "Wei Chen", "Siti Abdullah", "Farah Ismail", "Aisha Rahman", "Ked Mardemootoo"]));
  const order = ["admin", "agent", "hr", "manager", "requester"];
  personas.sort((a, b) => order.indexOf(a.role) - order.indexOf(b.role));
  const fallbackRequester = personas.some((p) => p.role === "requester") ? [] : await db.select({ id: schema.people.id, displayName: schema.people.displayName, jobTitle: schema.people.jobTitle, role: schema.people.role, department: schema.people.department }).from(schema.people).where(inArray(schema.people.role, ["requester"])).limit(1);
  const list = [...personas, ...fallbackRequester];
  return (
    <main className="grid min-h-dvh lg:grid-cols-[1.1fr_1fr]">
      <section className="relative hidden overflow-hidden bg-ink text-canvas lg:block dark:bg-surface">
        <FlightField />
        <div className="relative flex h-full flex-col justify-between p-12">
          <Logo className="[&_span]:text-canvas dark:[&_span]:text-ink" />
          <div className="max-w-md">
            <p className="font-display text-[44px] leading-[1.05] tracking-[-0.01em]">
              Every request, <em>from hello to goodbye.</em>
            </p>
            <p className="mt-4 text-[14px] leading-relaxed text-canvas/70 dark:text-ink-2">Tickets, devices, joiners and leavers in one place — with the whole Freshservice history behind it.</p>
          </div>
          <p className="font-mono text-[11px] text-canvas/40 dark:text-ink-3">IT QI Group · internal · dev environment</p>
        </div>
      </section>
      <section className="flex items-center justify-center p-8">
        <div className="w-full max-w-sm">
          <Logo className="mb-8 lg:hidden" />
          <h1 className="text-[22px] font-semibold tracking-[-0.01em]">Sign in</h1>
          <p className="mt-1 text-[13px] text-ink-3">Production uses your Microsoft account. In dev, pick a persona to see the product from their seat.</p>
          <div className="mt-6 space-y-1.5">
            {list.map((p) => (
              <form key={p.id} action={signInAs.bind(null, p.id)}>
                <button className="group flex w-full items-center gap-3 rounded-lg bg-surface px-3 py-2.5 text-left transition-all hairline hover:shadow-2">
                  <Avatar name={p.displayName} size={32} />
                  <span className="min-w-0 flex-1">
                    <span className="block text-[13.5px] font-medium">{p.displayName}</span>
                    <span className="block truncate text-[12px] text-ink-3">{p.jobTitle} · {p.department}</span>
                  </span>
                  <span className="rounded bg-surface-2 px-1.5 py-0.5 text-[11px] font-medium text-ink-2">{p.role === "hr" ? "HR" : p.role[0]!.toUpperCase() + p.role.slice(1)}</span>
                </button>
              </form>
            ))}
          </div>
          <p className="mt-8 text-center text-[12px] text-ink-4">Entra ID · single sign-on · no passwords stored</p>
        </div>
      </section>
    </main>
  );
}

function FlightField() {
  // Decorative: a field of dotted flight paths, generated deterministically.
  const paths = Array.from({ length: 9 }, (_, i) => {
    const y = 80 + i * 70;
    const c1 = 200 + ((i * 137) % 300);
    const c2 = 500 + ((i * 89) % 300);
    return `M-40 ${y + 40} C ${c1} ${y - 120}, ${c2} ${y + 160}, 900 ${y - 60}`;
  });
  return (
    <svg className="absolute inset-0 h-full w-full opacity-[0.22]" viewBox="0 0 860 720" preserveAspectRatio="xMidYMid slice" aria-hidden>
      {paths.map((d, i) => (
        <path key={i} d={d} fill="none" stroke="currentColor" strokeWidth="1" strokeDasharray="2 6" strokeLinecap="round" />
      ))}
      {paths.map((_, i) => (
        <circle key={i} cx={620 + ((i * 53) % 200)} cy={90 + i * 70 + ((i * 31) % 40)} r="2.5" fill="currentColor" />
      ))}
    </svg>
  );
}
