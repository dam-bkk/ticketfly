import { runRuleNow, toggleRule } from "@/app/extra-actions";
import { requireStaff } from "@/lib/auth";
import { listRules, SCENARIOS } from "@/lib/automation";
import { cn, relTime } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Tone } from "@/components/ui/pills";

export const metadata = { title: "Automation" };

const KIND_LABEL: Record<string, string> = { closure: "Closure rule", assignment: "Assignment policy", supervisor: "Supervisor rule", alert: "Alert rule" };

export default async function AutomationPage() {
  await requireStaff();
  const rules = await listRules();
  return (
    <div className="max-w-3xl">
      <h1 className="text-[20px] font-semibold tracking-[-0.01em]">Automation</h1>
      <p className="text-[13px] text-ink-3">Freshservice's Workflow Automator, Supervisor Rules, Closure Rules and Assignment Policies — as rules that live in code with a unit test each. Switch them on or off here; run one now to see what it would do.</p>
      <div className="mt-5 space-y-2">
        {rules.map((r) => (
          <div key={r.key} className={cn("panel flex items-start gap-4 p-4", !r.enabled && "opacity-70")}>
            <form action={toggleRule.bind(null, r.key)}>
              <button type="submit" role="switch" aria-checked={r.enabled} className={cn("relative mt-0.5 h-5 w-9 rounded-full transition-colors", r.enabled ? "bg-accent" : "bg-surface-3")}>
                <span className={cn("absolute top-0.5 size-4 rounded-full bg-white shadow-sm transition-transform", r.enabled ? "translate-x-4" : "translate-x-0.5")} />
              </button>
            </form>
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-[14px] font-medium">{r.name}</span>
                <Tone tone="neutral">{KIND_LABEL[r.kind] ?? r.kind}</Tone>
                <span className="text-[12px] text-ink-3">{r.schedule}</span>
              </div>
              <p className="mt-0.5 text-[13px] text-ink-2">{r.description}</p>
              <p className="mt-1.5 font-mono text-[11.5px] text-ink-3">
                {r.lastRunAt ? `last run ${relTime(r.lastRunAt)} → ${r.lastResult}` : "never run"} · {r.runs.toLocaleString()} runs · config {JSON.stringify(r.config)}
              </p>
            </div>
            <form action={runRuleNow.bind(null, r.key)}>
              <Button type="submit" size="sm" variant="secondary" disabled={!r.enabled}>Run now</Button>
            </form>
          </div>
        ))}
      </div>
      <h2 className="mt-8 text-[15px] font-semibold">Scenario automations</h2>
      <p className="text-[13px] text-ink-3">One-click macros in the ticket composer. Each is a fixed set of actions so the outcome is always the same.</p>
      <ul className="panel mt-3 divide-y divide-line overflow-hidden">
        {SCENARIOS.map((s) => (
          <li key={s.key} className="px-4 py-2.5 text-[13px]">
            <span className="font-medium">{s.label}</span> <span className="text-ink-3">— {s.description}</span>
          </li>
        ))}
      </ul>
      <p className="mt-4 text-[12px] text-ink-3">Adding a rule is a pull request: a function in <code>packages/core/automation.ts</code>, its test, and a row here. Every run and every toggle is in the activity log.</p>
    </div>
  );
}
