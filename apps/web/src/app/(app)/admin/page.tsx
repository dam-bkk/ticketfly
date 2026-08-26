import Link from "next/link";
import { Search } from "lucide-react";
import { requireStaff } from "@/lib/auth";
import { cn } from "@/lib/utils";

export const metadata = { title: "Admin" };

type Tile = { title: string; desc: string; href?: string; live?: boolean };
type Section = { title: string; desc: string; groups: { title?: string; tiles: Tile[] }[] };

const SECTIONS: Section[] = [
  { title: "Account Settings", desc: "Manage account configurations and customizations for your service desk", groups: [{ tiles: [{ title: "Manage Workspaces", desc: "Workspaces, members and configurations — isolation per department arrives in Phase 3" }, { title: "Service Desk Settings", desc: "Name, reference prefix, support mailbox, requester options", href: "/admin/general", live: true }, { title: "Portals", desc: "Customize the requester portal — the one people actually like", href: "/portal" }, { title: "Email Notifications", desc: "Which events email whom, with templates" }, { title: "Data Archival", desc: "Not needed: Postgres keeps the whole Freshservice history searchable" }] }] },
  { title: "User Management", desc: "Manage users, groups and permissions across the service desk", groups: [{ tiles: [{ title: "Agents", desc: "Everyone with an Agent or Admin app role in Entra ID", href: "/people?status=active", live: true }, { title: "Roles", desc: "Capability matrix mapped from Entra app roles", href: "/admin/roles", live: true }, { title: "Departments", desc: "Synced from Entra ID; used for asset and cost roll-ups" }, { title: "Requesters", desc: "Every person record, devices and access grants", href: "/people", live: true }, { title: "Agent Groups", desc: "Service Desk, Endpoint & Devices, Identity & Access, Network & Infrastructure" }, { title: "CAB", desc: "Change Advisory Board membership — Phase 2" }, { title: "Work Schedule", desc: "Working hours per agent for workload — Phase 4" }] }] },
  { title: "Channels", desc: "Manage your support channels - email, Teams and the portal", groups: [{ title: "Email", tiles: [{ title: "Email Settings and Mailboxes", desc: "support@ via Microsoft Graph — inbound subscription + outbound sendMail", href: "/admin/integrations", live: true }] }, { title: "Other Channels", tiles: [{ title: "Servicebot for Microsoft Teams", desc: "Raise and track requests from Teams — Phase 3" }, { title: "Status Pages", desc: "Planned maintenance and live incidents for staff", href: "/it-ops/status" }] }] },
  {
    title: "Service Management",
    desc: "Manage the end to end service delivery configurations for your organization",
    groups: [
      { title: "Service Desk Settings", tiles: [{ title: "Business Hours", desc: "Working hours and holiday calendar that SLA clocks follow", href: "/admin/general", live: true }, { title: "SLA and OLA Policies", desc: "Targets per priority; pause conditions", href: "/admin/sla", live: true }, { title: "Priority Matrix", desc: "Impact × urgency → priority", href: "/admin/sla", live: true }, { title: "Field Manager", desc: "Custom fields on tickets and assets" }, { title: "Form Templates", desc: "Pre-filled forms for repetitive tickets" }, { title: "Business Rules for Forms", desc: "Conditional logic on portal forms" }, { title: "Tags", desc: "Free-form tags on tickets" }, { title: "Surveys", desc: "CSAT on close is on by default", href: "/admin/general", live: true }, { title: "Closure Rules", desc: "Auto-close resolved tickets after 3 days" }, { title: "Ticket Assignment Policies", desc: "Round-robin and load-based assignment" }, { title: "Checklist Templates", desc: "Task lists agents complete on a request" }, { title: "Knowledge Base", desc: "Article review cadence and portal visibility", href: "/solutions", live: true }] },
      { title: "Service Request Management", tiles: [{ title: "Service Catalog", desc: "What requesters can ask for, in plain words", href: "/portal", live: true }, { title: "Employee Onboarding", desc: "Join − 5 days provisioning, access cloning, day-one activation", href: "/journeys/onboarding", live: true }, { title: "Employee Offboarding", desc: "Scheduled revocation with HR watchdog", href: "/journeys/offboarding", live: true }] },
      { title: "Change Management", tiles: [{ title: "Change Lifecycle", desc: "Transitions per change type — Phase 2", href: "/changes" }, { title: "Change Risk Policy", desc: "Risk scoring — Phase 2", href: "/changes" }] },
    ],
  },
  { title: "Automation & Productivity", desc: "Supercharge your service desk with automations, integrations and agent productivity tools", groups: [{ title: "Automation", tiles: [{ title: "Workflow Automator", desc: "Event → condition → action, versioned like code" }, { title: "Supervisor Rules", desc: "Hourly checks on matching tickets" }, { title: "Scenario Automations", desc: "One-click multi-action templates" }, { title: "Credentials", desc: "Key Vault references, never stored here", href: "/admin/integrations", live: true }] }, { title: "Agent Productivity", tiles: [{ title: "Canned Responses", desc: "Three built in; library editor next", href: "/tickets", live: true }, { title: "Scheduler", desc: "Periodic ticket creation for recurring tasks" }, { title: "Leaderboard", desc: "Not planned — gamified ticket closing is not a goal" }] }, { title: "Extensibility", tiles: [{ title: "Apps", desc: "Not needed — integrations are first-class modules" }, { title: "Custom Objects", desc: "Reference tables used in forms and workflows" }] }] },
  { title: "Asset Management", desc: "Discover and manage assets and their related information", groups: [{ tiles: [{ title: "Asset Types & Fields", desc: "Laptop, desktop, mobile, tablet, monitor, peripheral, server" }, { title: "Discovery Hub", desc: "Intune + Defender + sign-in logs; no agent to install, no asset cap", href: "/admin/integrations", live: true }, { title: "Product Catalog", desc: "Models in use, normalised from discovery", href: "/assets/inventory", live: true }, { title: "SaaS Management", desc: "Licence seats vs installs", href: "/assets/software", live: true }, { title: "Vendors", desc: "From contracts and purchase orders", href: "/assets/contracts", live: true }, { title: "Contract Types", desc: "Software, warranty, maintenance", href: "/assets/contracts", live: true }, { title: "Purchase Order Fields", desc: "PO capture fields", href: "/assets/purchase-orders", live: true }, { title: "Locations", desc: "HK, KL, SG, Dubai, Bangkok, Manila + last-seen city" }, { title: "Asset Depreciation", desc: "3-year straight-line shown on Expenses tab", live: true }, { title: "Relationship Types", desc: "Upstream / downstream — CMDB phase" }] }] },
  { title: "IT Operations Management", desc: "Track and manage the health of your IT Infrastructure Operations", groups: [{ tiles: [{ title: "Alert Rules", desc: "Defender / Azure Monitor signals → incidents — Phase 3", href: "/it-ops/alerts" }, { title: "Monitoring Tools", desc: "Connected sources", href: "/admin/integrations", live: true }, { title: "On-call schedules", desc: "Phase 3" }, { title: "Alert Field Manager", desc: "Phase 3" }] }] },
  { title: "Operations (Service Desk)", desc: "What Freshservice never showed you", groups: [{ tiles: [{ title: "Activity log", desc: "Every change: who, what, where from, before → after", href: "/admin/activity", live: true }, { title: "Releases", desc: "Every build, semver derived from commits", href: "/admin/releases", live: true }, { title: "System status", desc: "Jobs, sync freshness, backup age", href: "/admin/status", live: true }, { title: "Integrations", desc: "Entra, Graph mail, Intune, Defender, Log Analytics", href: "/admin/integrations", live: true }] }] },
];

export default async function AdminHub({ searchParams }: { searchParams: Promise<{ q?: string }> }) {
  await requireStaff();
  const { q = "" } = await searchParams;
  const term = q.trim().toLowerCase();
  const filtered = term
    ? SECTIONS.map((s) => ({ ...s, groups: s.groups.map((g) => ({ ...g, tiles: g.tiles.filter((t) => `${t.title} ${t.desc}`.toLowerCase().includes(term)) })).filter((g) => g.tiles.length) })).filter((s) => s.groups.length)
    : SECTIONS;
  return (
    <div className="max-w-[1180px]">
      <form className="mb-6">
        <label className="flex h-11 items-center gap-2 rounded-lg bg-surface px-4 hairline focus-within:shadow-[inset_0_0_0_1px_var(--accent),0_0_0_3px_var(--ring)]">
          <Search className="size-4 text-ink-3" />
          <input name="q" defaultValue={q} placeholder="Search admin" className="flex-1 bg-transparent text-[14px] outline-none" />
        </label>
      </form>
      <div className="space-y-10">
        {filtered.map((s) => (
          <section key={s.title}>
            <h2 className="text-[18px] font-semibold tracking-[-0.01em]">{s.title}</h2>
            <p className="text-[13px] text-ink-3">{s.desc}</p>
            {s.groups.map((g, i) => (
              <div key={i} className="mt-4">
                {g.title && <p className="mb-2 border-l-2 border-line-strong pl-2 text-[13px] font-medium">{g.title}</p>}
                <div className="grid gap-x-6 gap-y-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
                  {g.tiles.map((t) => {
                    const inner = (
                      <>
                        <span className="flex items-center gap-2">
                          <span className={cn("size-1.5 rounded-full", t.live ? "bg-ok" : "bg-ink-4")} />
                          <span className={cn("text-[13px] font-medium", t.href ? "text-accent-ink" : "text-ink")}>{t.title}</span>
                        </span>
                        <span className="mt-1 block text-[12px] leading-snug text-ink-3">{t.desc}</span>
                      </>
                    );
                    return t.href ? (
                      <Link key={t.title} href={t.href} className="block rounded-md px-2 py-1.5 -mx-2 hover:bg-surface-2">
                        {inner}
                      </Link>
                    ) : (
                      <div key={t.title} className="px-2 py-1.5 -mx-2 opacity-80">
                        {inner}
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
          </section>
        ))}
      </div>
      <p className="mt-10 text-[12px] text-ink-4">Green dot = live in Service Desk today. Grey = same place as Freshservice, coming in the phase noted.</p>
    </div>
  );
}
