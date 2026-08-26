import { format } from "date-fns";
import { APP_ENV, APP_VERSION, requireStaff } from "@/lib/auth";
import { listReleases } from "@/lib/queries";
import { cn, dayLabel } from "@/lib/utils";

export const metadata = { title: "Releases" };

const TYPE_TONE: Record<string, string> = { feat: "bg-accent-soft text-accent-ink", fix: "bg-ok-soft text-ok", perf: "bg-info-soft text-info", chore: "bg-surface-2 text-ink-3", refactor: "bg-surface-2 text-ink-3", docs: "bg-surface-2 text-ink-3" };
const BUMP_TONE: Record<string, string> = { major: "text-crit", minor: "text-accent-ink", patch: "text-ink-3" };

export default async function ReleasesPage() {
  await requireStaff();
  const releases = await listReleases();
  const byDay = releases.reduce<Record<string, typeof releases>>((acc, r) => {
    const k = format(r.releasedAt, "yyyy-MM-dd");
    (acc[k] ??= []).push(r);
    return acc;
  }, {});
  return (
    <div className="max-w-3xl">
      <div className="flex items-end justify-between">
        <div>
          <h1 className="text-[20px] font-semibold tracking-[-0.01em]">Releases</h1>
          <p className="text-[13px] text-ink-3">Every build writes an entry. Versions are derived from Conventional Commits — never typed by hand.</p>
        </div>
        <div className="panel px-4 py-2.5 text-right">
          <p className="label">Running now</p>
          <p className="font-mono text-[15px] font-semibold">v{APP_VERSION}</p>
          <p className="text-[11.5px] text-ink-3">{APP_ENV} · {process.env.GIT_SHA?.slice(0, 7) ?? "local"}</p>
        </div>
      </div>
      <div className="mt-6 space-y-6">
        {Object.entries(byDay).map(([day, rs]) => (
          <section key={day}>
            <p className="label mb-2">{dayLabel(day)}</p>
            <div className="space-y-3">
              {rs.map((r) => (
                <article key={r.id} className="panel p-5">
                  <div className="flex items-baseline gap-3">
                    <span className="font-mono text-[16px] font-semibold">v{r.version}</span>
                    <span className={cn("text-[12px] font-medium capitalize", BUMP_TONE[r.bump])}>{r.bump}</span>
                    <span className="text-[12px] text-ink-3">
                      {format(r.releasedAt, "HH:mm")} · {r.environment} · <span className="font-mono">{r.commitSha}</span>
                    </span>
                  </div>
                  {r.notes && <p className="mt-2 text-[13.5px] text-ink-2">{r.notes}</p>}
                  <ul className="mt-3 space-y-1.5">
                    {r.changes.map((c, i) => (
                      <li key={i} className="flex items-center gap-2 text-[13px]">
                        <span className={cn("w-12 rounded px-1.5 py-0.5 text-center font-mono text-[10.5px] font-medium", TYPE_TONE[c.type] ?? TYPE_TONE.chore)}>{c.type}</span>
                        {c.scope && <span className="font-mono text-[11.5px] text-ink-3">{c.scope}</span>}
                        <span className="text-ink">{c.subject}</span>
                      </li>
                    ))}
                  </ul>
                </article>
              ))}
            </div>
          </section>
        ))}
      </div>
      <div className="panel mt-6 p-5">
        <h2 className="text-[14px] font-semibold">How versions are decided</h2>
        <dl className="mt-3 grid grid-cols-[100px_1fr] gap-x-4 gap-y-1.5 text-[13px]">
          <dt className="font-mono text-ink-3">fix:</dt>
          <dd>patch — 1.4.2 → 1.4.<strong>3</strong></dd>
          <dt className="font-mono text-ink-3">feat:</dt>
          <dd>minor — 1.4.2 → 1.<strong>5</strong>.0</dd>
          <dt className="font-mono text-ink-3">feat!:</dt>
          <dd>
            major — 1.4.2 → <strong>2</strong>.0.0 (also any <span className="font-mono">BREAKING CHANGE:</span> footer or a migration that drops or renames a column)
          </dd>
        </dl>
      </div>
    </div>
  );
}
