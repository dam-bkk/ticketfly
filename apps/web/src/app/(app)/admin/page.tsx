import Link from "next/link";
import { Search } from "lucide-react";
import { requireStaff } from "@/lib/auth";
import { Input } from "@/components/ui/input";
import { Tone } from "@/components/ui/pills";
import { cn } from "@/lib/utils";

export const metadata = { title: "Admin" };

/** `soon` marks an area that is not available yet; it shows a "Coming soon" pill and no link. */
type Tile = { title: string; desc: string; href?: string; soon?: boolean };
type Section = { title: string; desc: string; groups: { title?: string; tiles: Tile[] }[] };

const SECTIONS: Section[] = [
  {
    title: "Account Settings",
    desc: "Manage account configurations and customizations for your service desk",
    groups: [
      {
        tiles: [
          { title: "Manage Workspaces", desc: "Members per workspace; agents see only theirs, admins see all", href: "/admin/workspaces" },
          { title: "Service Desk Settings", desc: "Name, reference prefix, support mailbox, requester options", href: "/admin/general" },
          { title: "Portals", desc: "Requester portal layout, catalog and announcements", href: "/portal" },
          { title: "Email Notifications", desc: "Per-event in-app, email and Teams preferences", href: "/notifications/preferences" },
          { title: "Data Archival", desc: "Full ticket history stays online and searchable; nothing is archived away", href: "/admin/status" },
        ],
      },
    ],
  },
  {
    title: "User Management",
    desc: "Manage users, groups and permissions across the service desk",
    groups: [
      {
        tiles: [
          { title: "Agents", desc: "Everyone with an Agent or Admin app role in Entra ID", href: "/people?status=active" },
          { title: "Roles", desc: "Capability matrix mapped from Entra app roles", href: "/admin/roles" },
          { title: "Departments", desc: "Synced from Entra ID; used for asset and cost roll-ups", href: "/people" },
          { title: "Requesters", desc: "Every person record, devices and access grants", href: "/people" },
          { title: "Agent Groups", desc: "Servicedesk Support, Cloud Infrastructure Support, Security Operations Centre, Database, Automation", href: "/dashboard" },
          { title: "CAB", desc: "Approvers picked per change; Nada and Ked by default", href: "/changes?f=approval" },
          { title: "Work Schedule", desc: "Working hours per agent, used for workload planning", soon: true },
        ],
      },
    ],
  },
  {
    title: "Channels",
    desc: "Manage your support channels - email, Teams and the portal",
    groups: [
      { title: "Email", tiles: [{ title: "Email Settings and Mailboxes", desc: "support@ mailbox via Microsoft Graph, inbound and outbound", href: "/admin/integrations" }] },
      {
        title: "Other Channels",
        tiles: [
          { title: "Servicebot for Microsoft Teams", desc: "Raise and track requests from Microsoft Teams", soon: true },
          { title: "Status Pages", desc: "Service health and maintenance windows", href: "/it-ops/status" },
        ],
      },
    ],
  },
  {
    title: "Service Management",
    desc: "Manage the end to end service delivery configurations for your organization",
    groups: [
      {
        title: "Service Desk Settings",
        tiles: [
          { title: "Business Hours", desc: "Working hours and holiday calendar that SLA clocks follow", href: "/admin/general" },
          { title: "SLA and OLA Policies", desc: "Targets per priority; pause conditions", href: "/admin/sla" },
          { title: "Priority Matrix", desc: "Impact and urgency combine into a priority", href: "/admin/sla" },
          { title: "Field Manager", desc: "Custom fields on tickets, optionally per workspace", href: "/admin/fields" },
          { title: "Form Templates", desc: "Pre-filled forms for repetitive tickets", soon: true },
          { title: "Business Rules for Forms", desc: "Conditional logic on portal forms", soon: true },
          { title: "Tags", desc: "Free-form tags on tickets", soon: true },
          { title: "Surveys", desc: "Satisfaction survey on ticket close", href: "/admin/general" },
          { title: "Closure Rules", desc: "Auto-close resolved tickets after 3 days", href: "/admin/automation" },
          { title: "Ticket Assignment Policies", desc: "Least-loaded round-robin per group", href: "/admin/automation" },
          { title: "Checklist Templates", desc: "Tasks on tickets, problems, changes and journeys", href: "/tasks" },
          { title: "Knowledge Base", desc: "Article review cadence and portal visibility", href: "/solutions" },
        ],
      },
      {
        title: "Service Request Management",
        tiles: [
          { title: "Service Catalog", desc: "What requesters can ask for, in plain words", href: "/portal" },
          { title: "Employee Onboarding", desc: "Provisioning ahead of the start date, access cloning, day-one activation", href: "/journeys/onboarding" },
          { title: "Employee Offboarding", desc: "Scheduled access revocation with an HR check", href: "/journeys/offboarding" },
        ],
      },
      {
        title: "Change Management",
        tiles: [
          { title: "Change Lifecycle", desc: "Planning, approval, in progress, completed, closed", href: "/changes" },
          { title: "Change Risk Policy", desc: "Risk and impact on every change; month-end freeze on the calendar", href: "/changes/calendar" },
        ],
      },
    ],
  },
  {
    title: "Automation & Productivity",
    desc: "Supercharge your service desk with automations, integrations and agent productivity tools",
    groups: [
      {
        title: "Automation",
        tiles: [
          { title: "Workflow Automator", desc: "Rules you can toggle and run from here", href: "/admin/automation" },
          { title: "Supervisor Rules", desc: "Waiting-requester reminders, SLA warnings", href: "/admin/automation" },
          { title: "Scenario Automations", desc: "One-click macros in the composer", href: "/admin/automation" },
          { title: "Credentials", desc: "Stored in Key Vault; only references are kept here", href: "/admin/integrations" },
        ],
      },
      {
        title: "Agent Productivity",
        tiles: [
          { title: "Canned Responses", desc: "Reusable replies inserted from the composer", href: "/tickets" },
          { title: "Scheduler", desc: "Periodic ticket creation for recurring tasks", soon: true },
        ],
      },
      {
        title: "Extensibility",
        tiles: [
          { title: "Apps", desc: "Connected services are managed under Integrations", href: "/admin/integrations" },
          { title: "Custom Objects", desc: "Reference tables used in forms and workflows", soon: true },
        ],
      },
    ],
  },
  {
    title: "Asset Management",
    desc: "Discover and manage assets and their related information",
    groups: [
      {
        tiles: [
          { title: "Asset Types & Fields", desc: "Laptop, desktop, mobile, tablet, monitor, peripheral, server", soon: true },
          { title: "Discovery Hub", desc: "Intune, Defender and sign-in logs feed the inventory automatically", href: "/admin/integrations" },
          { title: "Product Catalog", desc: "Models in use, normalised from discovery", href: "/assets/inventory" },
          { title: "SaaS Management", desc: "Licence seats versus installs", href: "/assets/software" },
          { title: "Vendors", desc: "From contracts and purchase orders", href: "/assets/contracts" },
          { title: "Contract Types", desc: "Software, warranty, maintenance", href: "/assets/contracts" },
          { title: "Purchase Order Fields", desc: "Purchase order capture fields", href: "/assets/purchase-orders" },
          { title: "Locations", desc: "Hong Kong, Kuala Lumpur, Singapore, Dubai, Bangkok, Manila, plus last-seen city", soon: true },
          { title: "Asset Depreciation", desc: "3-year straight-line, shown on each asset's Expenses tab", href: "/assets/inventory" },
          { title: "Relationship Types", desc: "Depends on, connected to, used by; on the Relationships tab", href: "/assets/inventory" },
        ],
      },
    ],
  },
  {
    title: "Project & Workload Management",
    desc: "Manage project and workload settings for your service desk",
    groups: [
      {
        tiles: [
          { title: "Project Fields", desc: "Task, status, owner, dates, % done, priority, notes", href: "/projects" },
          { title: "Project Collaboration", desc: "Grid, Gantt and Board views on the same rows", href: "/projects" },
          { title: "Smartsheet Import", desc: "Bring existing sheets in with column mapping", soon: true },
          { title: "Workload Management", desc: "Tasks per agent across modules", href: "/tasks?v=all" },
        ],
      },
    ],
  },
  {
    title: "IT Operations Management",
    desc: "Track and manage the health of your IT Infrastructure Operations",
    groups: [
      {
        tiles: [
          { title: "Alert Rules", desc: "De-duplication and auto-incident rules", href: "/admin/automation" },
          { title: "Monitoring Tools", desc: "Connected sources", href: "/admin/integrations" },
          { title: "On-call Schedules", desc: "Rotations and escalation for alerts", soon: true },
          { title: "Alert Field Manager", desc: "Custom fields on alerts", soon: true },
        ],
      },
    ],
  },
  {
    title: "Operations",
    desc: "Operational visibility for the service desk itself",
    groups: [
      {
        tiles: [
          { title: "Activity Log", desc: "Every change: who, what, where from, before and after", href: "/admin/activity" },
          { title: "Releases", desc: "Every build deployed, with version and date", href: "/admin/releases" },
          { title: "System Status", desc: "Jobs, sync freshness, backup age", href: "/admin/status" },
          { title: "Integrations", desc: "Entra, Graph mail, Intune, Defender, Log Analytics", href: "/admin/integrations" },
        ],
      },
    ],
  },
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
        <label className="relative block">
          <Search className="pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-ink-3" />
          <Input name="q" defaultValue={q} placeholder="Search admin" className="h-11 rounded-lg pl-10" />
        </label>
      </form>
      {filtered.length === 0 && <p className="text-[13.5px] text-ink-3">Nothing matches "{q}".</p>}
      <div className="space-y-10">
        {filtered.map((s) => (
          <section key={s.title}>
            <h2 className="text-[16px] font-semibold tracking-[-0.01em]">{s.title}</h2>
            <p className="text-[13.5px] text-ink-3">{s.desc}</p>
            {s.groups.map((g, i) => (
              <div key={g.title ?? i} className="mt-4">
                {g.title && <p className="label mb-3 pt-3 hairline-t">{g.title}</p>}
                <div className="grid gap-x-6 gap-y-4 sm:grid-cols-2 lg:grid-cols-4">
                  {g.tiles.map((t) => {
                    const inner = (
                      <>
                        <span className="flex items-start gap-2">
                          <span className={cn("min-w-0 text-[13.5px] font-medium", t.href && !t.soon ? "text-accent-ink" : "text-ink")}>{t.title}</span>
                          {t.soon && <Tone tone="neutral" className="h-5 shrink-0 whitespace-nowrap px-1.5 text-[11px]">Coming soon</Tone>}
                        </span>
                        <span className="mt-1 block text-[12.5px] leading-snug text-ink-3">{t.desc}</span>
                      </>
                    );
                    return t.href && !t.soon ? (
                      <Link key={t.title} href={t.href} className="-mx-2 block rounded-md px-2 py-1.5 hover:bg-surface-2">
                        {inner}
                      </Link>
                    ) : (
                      <div key={t.title} className="-mx-2 px-2 py-1.5">
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
    </div>
  );
}
