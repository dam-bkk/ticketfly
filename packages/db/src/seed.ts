/* Deterministic seed: realistic IT QI Group data for the MVP. Re-runnable (truncates first). */
import { addBusinessMinutes, DEFAULT_SLA, HK_BUSINESS_HOURS } from "@ticketfly/core";
import { sql } from "drizzle-orm";
import { db, schema } from "./index";

// Mulberry32 — deterministic RNG so screenshots and tests are reproducible.
function rng(seed: number) {
  return () => {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
const rand = rng(20260826);
const pick = <T,>(arr: readonly T[]): T => arr[Math.floor(rand() * arr.length)] as T;
const chance = (p: number) => rand() < p;
const between = (a: number, b: number) => a + Math.floor(rand() * (b - a + 1));

const NOW = new Date("2026-08-26T09:30:00+08:00");
const daysAgo = (d: number, h = 0) => new Date(NOW.getTime() - d * 86_400_000 - h * 3_600_000);
const hoursAgo = (h: number) => new Date(NOW.getTime() - h * 3_600_000);

const DEPARTMENTS = ["Finance", "Marketing", "Operations", "Sales", "Legal", "People & Culture", "Product", "Customer Care", "IT", "Compliance"];
const OFFICES = ["Hong Kong", "Kuala Lumpur", "Singapore", "Dubai", "Bangkok", "Manila"];
const CITY_COUNTRY: Record<string, string> = { "Hong Kong": "HK", "Kuala Lumpur": "MY", Singapore: "SG", Dubai: "AE", Bangkok: "TH", Manila: "PH", London: "GB", Paris: "FR" };

const FIRST = ["Aisha", "Wei", "Priya", "Marcus", "Siti", "Daniel", "Mei Lin", "Rahul", "Sofia", "Kenji", "Nadia", "Omar", "Grace", "Farah", "Jun", "Elena", "Hafiz", "Chloe", "Arjun", "Yuki", "Leila", "Tomas", "Ananya", "Kai", "Zara", "Ravi", "Hana", "Ibrahim", "Ling", "Noor", "Adrian", "Sakura", "Dev", "Maya", "Ken", "Amira", "Lucas", "Ines", "Tariq", "Suki"];
const LAST = ["Rahman", "Chen", "Sharma", "Tan", "Abdullah", "Lim", "Wong", "Patel", "Costa", "Nakamura", "Hussain", "Khan", "Lee", "Ismail", "Park", "Petrova", "Osman", "Dubois", "Mehta", "Sato", "Haddad", "Novak", "Iyer", "Ho", "Malik", "Nair", "Kim", "Farouk", "Zhang", "Aziz"];

const INCIDENT_SUBJECTS = [
  "Cannot connect to VPN from home",
  "Outlook keeps asking for password",
  "Laptop battery drains in under two hours",
  "Teams audio cuts out during calls",
  "Printer on 12/F not responding",
  "Excel crashes when opening budget file",
  "SharePoint site access denied",
  "Two-factor prompt not arriving on phone",
  "Wi-Fi drops every few minutes in meeting room B",
  "OneDrive not syncing since this morning",
  "Screen flickering on external monitor",
  "Cannot open PDF attachments in Outlook",
  "Slow performance after Windows update",
  "Adobe Acrobat licence expired message",
  "Shared mailbox missing from Outlook",
  "Keyboard keys sticking on MacBook",
  "Zoom plugin missing from calendar",
  "Unable to print to colour printer",
  "Power BI dashboard not refreshing",
  "Phishing email received — please check",
  "Account locked after password change",
  "Bluetooth headset not pairing",
  "Email signature not applying",
  "Calendar invites showing wrong time zone",
];
const REQUEST_SUBJECTS = [
  "Request for second monitor",
  "Access to Finance shared drive",
  "New laptop for field work",
  "Install Figma on my workstation",
  "Add me to the Marketing distribution list",
  "Request Adobe Creative Cloud licence",
  "Mobile phone replacement",
  "Access to Salesforce reports",
  "Set up shared mailbox for Events team",
  "Request Power BI Pro licence",
  "Docking station for hot desk",
  "Guest Wi-Fi access for visiting auditors",
  "Change display name in directory",
  "Access to HR system for new team lead",
  "Request a headset for calls",
];
const NAME_PREFIXES = ["", "Urgent: ", "RE: ", "FW: ", ""];

const DESCRIPTIONS = [
  "Started happening this morning after I restarted. I have already tried turning it off and on again and checked the cables.",
  "This is blocking me from finishing the month-end pack. Please prioritise if possible — happy to jump on a call.",
  "Same issue as my colleague reported last week. Screenshot attached. Let me know if you need anything else from my side.",
  "Not urgent, but it has been going on for a while and it is slowing me down every day.",
  "I am travelling this week so remote fix would be ideal. Available on Teams between 10:00 and 16:00 HKT.",
  "Manager has approved this request. Cost centre 4410. Needed before the client workshop on Friday.",
];

const REPLIES_AGENT = [
  "Thanks for reaching out. I have picked this up and will update you shortly.",
  "Could you confirm whether this happens on the office network as well as at home?",
  "I have pushed a policy update to your device — please restart when convenient and let me know if it persists.",
  "This is now resolved on our side. Please confirm and I will close the ticket.",
  "I have escalated this to the network team; they are looking at it as we speak.",
  "Licence assigned. It can take up to 15 minutes to appear — sign out and back in if it does not.",
  "Your replacement has been ordered (ETA 3 working days). I will let you know when it arrives at reception.",
];
const REPLIES_REQUESTER = [
  "Thanks — that worked!",
  "Still seeing the same issue after the restart, unfortunately.",
  "Yes, it happens on both networks.",
  "Confirmed, all good now. Thank you for the quick turnaround.",
  "Any update on this? It is becoming urgent.",
];
const NOTES = [
  "Checked Intune: device compliant, last sync 20 min ago. Suspect cached credentials.",
  "Reproduced on test account. Raised with Microsoft support, case 2508-1193.",
  "Waiting on requester's manager approval before assigning licence.",
  "Asset TF-LT-0213 reassigned in inventory; old unit to stock.",
  "Known issue — see KB-0042. Linked to problem PRB-19.",
];

async function truncate() {
  await db.execute(sql`truncate table people, groups, group_members, categories, tickets, ticket_messages, activity_log, releases, assets, software, asset_software, services, onboardings, access_grants, sla_policies, system_jobs, saved_views, asset_assignments, problems, problem_incidents, changes, it_releases, tasks, alerts, it_services, projects, project_rows, notifications, user_prefs, workspaces, kb_folders, kb_articles, contracts, purchase_orders restart identity cascade`);
}

async function main() {
  console.log("Seeding ticketfly…");
  await truncate();

  // ---------- People ----------
  type P = typeof schema.people.$inferInsert;
  const peopleRows: P[] = [];
  const agentsSpec = [
    { displayName: "Nada Haddad", jobTitle: "Head of IT Service", role: "admin" as const, office: "Hong Kong" },
    { displayName: "Ked Mardemootoo", jobTitle: "Infrastructure Lead", role: "admin" as const, office: "Hong Kong" },
    { displayName: "Damien Fleury", jobTitle: "Platform Engineer", role: "admin" as const, office: "Bangkok" },
    { displayName: "Wei Chen", jobTitle: "Service Desk Analyst", role: "agent" as const, office: "Hong Kong" },
    { displayName: "Priya Sharma", jobTitle: "Service Desk Analyst", role: "agent" as const, office: "Kuala Lumpur" },
    { displayName: "Marcus Tan", jobTitle: "Endpoint Engineer", role: "agent" as const, office: "Singapore" },
    { displayName: "Siti Abdullah", jobTitle: "Identity & Access Analyst", role: "agent" as const, office: "Kuala Lumpur" },
    { displayName: "Daniel Lim", jobTitle: "Network Engineer", role: "agent" as const, office: "Hong Kong" },
    { displayName: "Farah Ismail", jobTitle: "HR Business Partner", role: "hr" as const, office: "Kuala Lumpur" },
    { displayName: "Grace Lee", jobTitle: "People Operations Manager", role: "hr" as const, office: "Hong Kong" },
  ];
  for (const a of agentsSpec) {
    const [f, l] = a.displayName.split(" ");
    peopleRows.push({
      email: `${f!.toLowerCase()}.${l!.toLowerCase()}@qigroup.com`,
      displayName: a.displayName,
      jobTitle: a.jobTitle,
      department: a.role === "hr" ? "People & Culture" : "IT",
      officeLocation: a.office,
      role: a.role,
      status: "active",
      joinDate: `20${between(17, 24)}-0${between(1, 9)}-1${between(0, 9)}`,
    });
  }
  const used = new Set(peopleRows.map((p) => p.email));
  const TITLES = ["Analyst", "Senior Analyst", "Manager", "Associate", "Specialist", "Coordinator", "Director", "Executive", "Lead"];
  while (peopleRows.length < 72) {
    const f = pick(FIRST);
    const l = pick(LAST);
    const email = `${f.toLowerCase().replace(/\s/g, "")}.${l.toLowerCase()}@qigroup.com`;
    if (used.has(email)) continue;
    used.add(email);
    const dept = pick(DEPARTMENTS.filter((d) => d !== "IT"));
    peopleRows.push({
      email,
      displayName: `${f} ${l}`,
      jobTitle: `${dept} ${pick(TITLES)}`,
      department: dept,
      officeLocation: pick(OFFICES),
      role: chance(0.12) ? "manager" : "requester",
      status: "active",
      joinDate: `20${between(15, 25)}-${String(between(1, 12)).padStart(2, "0")}-${String(between(1, 28)).padStart(2, "0")}`,
    });
  }
  // Joiners & leavers for onboarding module
  peopleRows.push(
    { email: "elena.petrova@qigroup.com", displayName: "Elena Petrova", jobTitle: "Marketing Manager", department: "Marketing", officeLocation: "Dubai", role: "requester", status: "onboarding", joinDate: "2026-09-01" },
    { email: "kai.ho@qigroup.com", displayName: "Kai Ho", jobTitle: "Finance Analyst", department: "Finance", officeLocation: "Hong Kong", role: "requester", status: "onboarding", joinDate: "2026-09-07" },
    { email: "amira.farouk@qigroup.com", displayName: "Amira Farouk", jobTitle: "Customer Care Lead", department: "Customer Care", officeLocation: "Manila", role: "requester", status: "onboarding", joinDate: "2026-08-31" },
    { email: "tomas.novak@qigroup.com", displayName: "Tomas Novak", jobTitle: "Sales Director", department: "Sales", officeLocation: "Singapore", role: "manager", status: "offboarding", joinDate: "2019-03-11", leaveDate: "2026-08-29" },
    { email: "ines.dubois@qigroup.com", displayName: "Ines Dubois", jobTitle: "Legal Counsel", department: "Legal", officeLocation: "Hong Kong", role: "requester", status: "offboarding", joinDate: "2021-06-01", leaveDate: "2026-08-22" },
  );
  const insertedPeople = await db.insert(schema.people).values(peopleRows).returning({ id: schema.people.id, role: schema.people.role, displayName: schema.people.displayName, department: schema.people.department, status: schema.people.status });
  const agents = insertedPeople.filter((p) => p.role === "agent" || p.role === "admin").filter((p) => p.displayName !== "Nada Haddad");
  const requesters = insertedPeople.filter((p) => p.role === "requester" || p.role === "manager").filter((p) => p.status === "active");
  const managers = insertedPeople.filter((p) => p.role === "manager");
  // managers
  for (const p of insertedPeople) {
    if (p.role === "requester" && managers.length) {
      await db.update(schema.people).set({ managerId: pick(managers).id }).where(sql`id = ${p.id}`);
    }
  }
  const byName = (n: string) => insertedPeople.find((p) => p.displayName === n)!;

  // ---------- Groups & categories ----------
  const groupRows = await db
    .insert(schema.groups)
    .values([
      { name: "Service Desk", description: "First line — incidents and requests" },
      { name: "Endpoint & Devices", description: "Laptops, mobiles, Intune, Defender" },
      { name: "Identity & Access", description: "Entra ID, licences, joiners and leavers" },
      { name: "Network & Infrastructure", description: "Wi-Fi, VPN, servers, Azure" },
    ])
    .returning();
  const gid = (n: string) => groupRows.find((g) => g.name === n)!.id;
  await db.insert(schema.groupMembers).values([
    { groupId: gid("Service Desk"), personId: byName("Wei Chen").id },
    { groupId: gid("Service Desk"), personId: byName("Priya Sharma").id },
    { groupId: gid("Endpoint & Devices"), personId: byName("Marcus Tan").id },
    { groupId: gid("Identity & Access"), personId: byName("Siti Abdullah").id },
    { groupId: gid("Network & Infrastructure"), personId: byName("Daniel Lim").id },
    { groupId: gid("Network & Infrastructure"), personId: byName("Ked Mardemootoo").id },
  ]);
  const catRows = await db
    .insert(schema.categories)
    .values(["Hardware", "Software", "Access & Identity", "Network", "Email & Collaboration", "Security", "Mobile", "Printing", "Licences", "Onboarding", "Offboarding", "Other"].map((name) => ({ name })))
    .returning();
  const cat = (n: string) => catRows.find((c) => c.name === n)!.id;
  const catFor = (subject: string): number => {
    const s = subject.toLowerCase();
    if (/vpn|wi-fi|network/.test(s)) return cat("Network");
    if (/outlook|teams|mail|calendar|sharepoint|onedrive|zoom/.test(s)) return cat("Email & Collaboration");
    if (/print/.test(s)) return cat("Printing");
    if (/licence|adobe|power bi|figma/.test(s)) return cat("Licences");
    if (/access|password|locked|two-factor|distribution/.test(s)) return cat("Access & Identity");
    if (/phishing/.test(s)) return cat("Security");
    if (/phone|mobile/.test(s)) return cat("Mobile");
    if (/laptop|monitor|battery|keyboard|headset|docking|screen/.test(s)) return cat("Hardware");
    if (/excel|crash|update|plugin|install/.test(s)) return cat("Software");
    return cat("Other");
  };
  const groupFor = (categoryId: number): number => {
    const name = catRows.find((c) => c.id === categoryId)!.name;
    if (name === "Network") return gid("Network & Infrastructure");
    if (name === "Hardware" || name === "Mobile") return gid("Endpoint & Devices");
    if (name === "Access & Identity" || name === "Licences" || name === "Onboarding" || name === "Offboarding") return gid("Identity & Access");
    return gid("Service Desk");
  };
  const agentsForGroup = (groupId: number) => {
    const name = groupRows.find((g) => g.id === groupId)!.name;
    const map: Record<string, string[]> = {
      "Service Desk": ["Wei Chen", "Priya Sharma"],
      "Endpoint & Devices": ["Marcus Tan", "Wei Chen"],
      "Identity & Access": ["Siti Abdullah", "Priya Sharma"],
      "Network & Infrastructure": ["Daniel Lim", "Ked Mardemootoo"],
    };
    return (map[name] ?? ["Wei Chen"]).map(byName);
  };

  // ---------- SLA policies ----------
  await db.insert(schema.slaPolicies).values(
    (["urgent", "high", "medium", "low"] as const).map((p) => ({
      name: `${p[0]!.toUpperCase()}${p.slice(1)} priority`,
      priority: p,
      firstResponseMinutes: DEFAULT_SLA[p].firstResponseMinutes,
      resolutionMinutes: DEFAULT_SLA[p].resolutionMinutes,
      calendarHours: DEFAULT_SLA[p].calendarHours ?? false,
    })),
  );

  // ---------- Tickets ----------
  type T = typeof schema.tickets.$inferInsert;
  const ticketRows: T[] = [];
  const messageQueue: { idx: number; msgs: (typeof schema.ticketMessages.$inferInsert)[] }[] = [];

  const priorities: ("low" | "medium" | "high" | "urgent")[] = ["low", "medium", "medium", "medium", "high", "high", "urgent"];

  // Legacy (imported) tickets: INC-4xxx / SR-1xxx from 2023 → July 2026, all closed.
  let incNo = 4120;
  let srNo = 1480;
  for (let i = 0; i < 210; i++) {
    const isReq = chance(0.35);
    const subject = isReq ? pick(REQUEST_SUBJECTS) : pick(INCIDENT_SUBJECTS);
    const createdAt = daysAgo(between(40, 1100), between(0, 9));
    const priority = pick(priorities);
    const categoryId = catFor(subject);
    const groupId = groupFor(categoryId);
    const assignee = pick(agentsForGroup(groupId));
    const firstResp = new Date(createdAt.getTime() + between(10, 300) * 60_000);
    const resolved = new Date(firstResp.getTime() + between(1, 72) * 3_600_000);
    const legacyRef = isReq ? `SR-${srNo++}` : `INC-${incNo++}`;
    ticketRows.push({
      legacyRef,
      kind: isReq ? "request" : "incident",
      subject,
      description: pick(DESCRIPTIONS),
      status: "closed",
      priority,
      requesterId: pick(requesters).id,
      assigneeId: assignee.id,
      groupId,
      categoryId,
      source: "import",
      tags: ["freshservice"],
      createdAt,
      updatedAt: resolved,
      firstRespondedAt: firstResp,
      resolvedAt: resolved,
      closedAt: new Date(resolved.getTime() + 2 * 86_400_000),
      firstResponseDueAt: new Date(addBusinessMinutes(createdAt.getTime(), DEFAULT_SLA[priority].firstResponseMinutes, HK_BUSINESS_HOURS)),
      resolutionDueAt: new Date(addBusinessMinutes(createdAt.getTime(), DEFAULT_SLA[priority].resolutionMinutes, HK_BUSINESS_HOURS)),
      satisfaction: chance(0.6) ? between(3, 5) : null,
      raw: { source: "freshservice", display_id: Number(legacyRef.split("-")[1]), type: isReq ? "Service Request" : "Incident", imported_at: "2026-08-20T02:00:00Z" },
    });
    messageQueue.push({
      idx: ticketRows.length - 1,
      msgs: [
        { ticketId: 0, authorId: assignee.id, kind: "reply", body: pick(REPLIES_AGENT), via: "email", createdAt: firstResp },
        ...(chance(0.6) ? [{ ticketId: 0, authorId: null, kind: "reply" as const, body: pick(REPLIES_REQUESTER), via: "email" as const, createdAt: new Date(firstResp.getTime() + 40 * 60_000) }] : []),
        ...(chance(0.5) ? [{ ticketId: 0, authorId: assignee.id, kind: "note" as const, body: pick(NOTES), via: "agent" as const, createdAt: new Date(firstResp.getTime() + 60 * 60_000) }] : []),
        { ticketId: 0, authorId: assignee.id, kind: "reply", body: "This is now resolved on our side. Please confirm and I will close the ticket.", via: "email", createdAt: resolved },
      ],
    });
  }

  // Live TicketFly tickets (last 30 days), mixed statuses.
  const liveStatuses: (typeof schema.tickets.$inferInsert)["status"][] = ["open", "open", "open", "in_progress", "in_progress", "pending", "on_hold", "resolved", "closed", "closed"];
  for (let i = 0; i < 130; i++) {
    const isReq = chance(0.4);
    const subject = `${pick(NAME_PREFIXES)}${isReq ? pick(REQUEST_SUBJECTS) : pick(INCIDENT_SUBJECTS)}`;
    // Most live work is recent; anything older than the medium allowance is resolved, waiting or on hold.
    const ageHours = chance(0.7) ? between(1, 60) : between(60, 30 * 24);
    const createdAt = hoursAgo(ageHours);
    const status = ageHours < 6 ? pick(["open", "open", "in_progress"] as const) : ageHours < 60 ? pick(liveStatuses) : pick(["resolved", "closed", "closed", "closed", "pending", "on_hold"] as const);
    const priority = pick(priorities);
    const categoryId = catFor(subject);
    const groupId = groupFor(categoryId);
    const assigned = status !== "open" || chance(0.4);
    const assignee = assigned ? pick(agentsForGroup(groupId)) : null;
    const responded = assigned && chance(0.85);
    const firstResp = responded ? new Date(createdAt.getTime() + between(5, 240) * 60_000) : null;
    const resolvedAt = status === "resolved" || status === "closed" ? new Date(createdAt.getTime() + between(1, 60) * 3_600_000) : null;
    const pausedSince = status === "pending" || status === "on_hold" ? new Date(createdAt.getTime() + between(1, 6) * 3_600_000) : null;
    ticketRows.push({
      kind: isReq ? "request" : "incident",
      subject,
      description: pick(DESCRIPTIONS),
      status,
      priority,
      requesterId: pick(requesters).id,
      assigneeId: assignee?.id ?? null,
      groupId,
      categoryId,
      source: pick(["portal", "portal", "email", "agent"] as const),
      tags: chance(0.3) ? [pick(["vip", "recurring", "hardware-swap", "kb-candidate"])] : [],
      createdAt,
      updatedAt: resolvedAt ?? firstResp ?? createdAt,
      firstRespondedAt: firstResp,
      resolvedAt,
      closedAt: status === "closed" ? resolvedAt : null,
      firstResponseDueAt: new Date(addBusinessMinutes(createdAt.getTime(), DEFAULT_SLA[priority].firstResponseMinutes, DEFAULT_SLA[priority].calendarHours ? { ...HK_BUSINESS_HOURS, days: [0, 1, 2, 3, 4, 5, 6], startMinutes: 0, endMinutes: 1440 } : HK_BUSINESS_HOURS)),
      resolutionDueAt: new Date(addBusinessMinutes(createdAt.getTime(), DEFAULT_SLA[priority].resolutionMinutes, DEFAULT_SLA[priority].calendarHours ? { ...HK_BUSINESS_HOURS, days: [0, 1, 2, 3, 4, 5, 6], startMinutes: 0, endMinutes: 1440 } : HK_BUSINESS_HOURS)),
      slaPausedSince: pausedSince,
      satisfaction: status === "closed" && chance(0.5) ? between(3, 5) : null,
    });
    const msgs: (typeof schema.ticketMessages.$inferInsert)[] = [];
    if (firstResp && assignee) msgs.push({ ticketId: 0, authorId: assignee.id, kind: "reply", body: pick(REPLIES_AGENT), via: "agent", createdAt: firstResp });
    if (firstResp && chance(0.5)) msgs.push({ ticketId: 0, authorId: null, kind: "reply", body: pick(REPLIES_REQUESTER), via: "portal", createdAt: new Date(firstResp.getTime() + between(20, 180) * 60_000) });
    if (assignee && chance(0.4)) msgs.push({ ticketId: 0, authorId: assignee.id, kind: "note", body: pick(NOTES), via: "agent", createdAt: new Date(createdAt.getTime() + between(30, 300) * 60_000) });
    if (resolvedAt && assignee) msgs.push({ ticketId: 0, authorId: assignee.id, kind: "reply", body: "This is now resolved on our side. Please confirm and I will close the ticket.", via: "agent", createdAt: resolvedAt });
    messageQueue.push({ idx: ticketRows.length - 1, msgs });
  }

  // Onboarding / offboarding tickets
  const onboardingPeople = insertedPeople.filter((p) => p.status === "onboarding" || p.status === "offboarding");
  const fullPeople = await db.select().from(schema.people);
  for (const p of onboardingPeople) {
    const full = fullPeople.find((f) => f.id === p.id)!;
    const isOff = p.status === "offboarding";
    ticketRows.push({
      kind: isOff ? "offboarding" : "onboarding",
      subject: `${isOff ? "Offboarding" : "Onboarding"}: ${p.displayName} — ${full.jobTitle}, ${p.department}`,
      description: isOff ? `Last working day ${full.leaveDate}. Revoke all access, reassign licences, convert mailbox.` : `Joins ${full.joinDate}. Account and licences ready 5 working days before; welcome pack on day one.`,
      status: "in_progress",
      priority: "high",
      requesterId: byName("Farah Ismail").id,
      assigneeId: byName("Siti Abdullah").id,
      groupId: gid("Identity & Access"),
      categoryId: cat(isOff ? "Offboarding" : "Onboarding"),
      source: "portal",
      tags: [isOff ? "leaver" : "joiner"],
      createdAt: daysAgo(between(3, 12)),
      updatedAt: hoursAgo(between(1, 30)),
      firstRespondedAt: daysAgo(between(2, 3)),
      firstResponseDueAt: daysAgo(2),
      resolutionDueAt: new Date(`${isOff ? full.leaveDate : full.joinDate}T09:00:00+08:00`),
    });
    messageQueue.push({ idx: ticketRows.length - 1, msgs: [{ ticketId: 0, authorId: byName("Siti Abdullah").id, kind: "note", body: isOff ? "Access grants list pulled from person record — 9 items to revoke on last day." : "Cloned access from reference colleague; 7 groups + 2 licences queued for join−5.", via: "agent", createdAt: daysAgo(2) }] });
  }

  const inserted = await db.insert(schema.tickets).values(ticketRows).returning({ id: schema.tickets.id, createdAt: schema.tickets.createdAt, requesterId: schema.tickets.requesterId });
  const msgRows: (typeof schema.ticketMessages.$inferInsert)[] = [];
  for (const q of messageQueue) {
    const t = inserted[q.idx]!;
    for (const m of q.msgs) msgRows.push({ ...m, ticketId: t.id, authorId: m.authorId ?? t.requesterId });
  }
  await db.insert(schema.ticketMessages).values(msgRows);

  // ---------- Assets & software ----------
  const softwareRows = await db
    .insert(schema.software)
    .values([
      { name: "Microsoft 365 Apps", vendor: "Microsoft", category: "Productivity", licenceModel: "subscription", unitMonthlyCost: "12.50", seatsOwned: 420 },
      { name: "Microsoft Teams", vendor: "Microsoft", category: "Collaboration", licenceModel: "subscription", unitMonthlyCost: "0", seatsOwned: 420 },
      { name: "Microsoft Defender for Endpoint", vendor: "Microsoft", category: "Security", licenceModel: "subscription", unitMonthlyCost: "5.20", seatsOwned: 420 },
      { name: "Adobe Acrobat Pro", vendor: "Adobe", category: "Productivity", licenceModel: "subscription", unitMonthlyCost: "19.99", seatsOwned: 60 },
      { name: "Adobe Creative Cloud", vendor: "Adobe", category: "Design", licenceModel: "subscription", unitMonthlyCost: "59.99", seatsOwned: 18 },
      { name: "Figma", vendor: "Figma", category: "Design", licenceModel: "subscription", unitMonthlyCost: "15.00", seatsOwned: 12 },
      { name: "Google Chrome", vendor: "Google", category: "Browser", licenceModel: "free", unitMonthlyCost: "0" },
      { name: "Zoom Workplace", vendor: "Zoom", category: "Collaboration", licenceModel: "subscription", unitMonthlyCost: "13.33", seatsOwned: 80 },
      { name: "Slack", vendor: "Salesforce", category: "Collaboration", licenceModel: "subscription", unitMonthlyCost: "8.75", seatsOwned: 40 },
      { name: "Power BI Pro", vendor: "Microsoft", category: "Analytics", licenceModel: "subscription", unitMonthlyCost: "10.00", seatsOwned: 35 },
      { name: "Visual Studio Code", vendor: "Microsoft", category: "Development", licenceModel: "free", unitMonthlyCost: "0" },
      { name: "7-Zip", vendor: "Igor Pavlov", category: "Utility", licenceModel: "free", unitMonthlyCost: "0" },
      { name: "Cisco Secure Client", vendor: "Cisco", category: "Network", licenceModel: "perpetual", unitMonthlyCost: "0" },
      { name: "Java Runtime", vendor: "Oracle", category: "Runtime", licenceModel: "free", unitMonthlyCost: "0" },
      { name: "Notion", vendor: "Notion Labs", category: "Productivity", licenceModel: "subscription", unitMonthlyCost: "10.00", seatsOwned: 25 },
      { name: "Salesforce Sales Cloud", vendor: "Salesforce", category: "CRM", licenceModel: "subscription", unitMonthlyCost: "80.00", seatsOwned: 45 },
      { name: "TeamViewer", vendor: "TeamViewer", category: "Remote", licenceModel: "unlicensed", unitMonthlyCost: "0" },
      { name: "Grammarly", vendor: "Grammarly", category: "Productivity", licenceModel: "unlicensed", unitMonthlyCost: "0" },
    ])
    .returning();
  const sw = (n: string) => softwareRows.find((s) => s.name === n)!;
  const versionsFor: Record<string, string[]> = {
    "Microsoft 365 Apps": ["16.0.19029", "16.0.18827", "16.0.18526"],
    "Google Chrome": ["139.0.7258", "138.0.7204", "137.0.7151"],
    "Adobe Acrobat Pro": ["25.001.20521", "24.005.20320"],
    "Cisco Secure Client": ["5.1.9", "5.1.6", "4.10.8"],
    "Java Runtime": ["8u451", "8u411", "17.0.12"],
    "Microsoft Defender for Endpoint": ["4.18.25070", "4.18.25060"],
    "Microsoft Teams": ["25165.2003", "25122.1415", "24335.208"],
    "Adobe Creative Cloud": ["6.5.0.532", "6.4.0.361"],
    Figma: ["125.6.5", "124.4.4"],
    "Zoom Workplace": ["6.5.3", "6.4.10", "6.3.1"],
    Slack: ["4.45.64", "4.44.65"],
    "Power BI Pro": ["2.145.1105", "2.144.878"],
    "Visual Studio Code": ["1.103.1", "1.102.3"],
    "7-Zip": ["24.09", "23.01"],
    Notion: ["4.16.0", "4.15.1"],
    TeamViewer: ["15.68.5", "15.64.4"],
    Grammarly: ["1.5.98", "1.5.90"],
  };
  const MODELS = {
    laptop: [["MacBook Pro 14 (M4)", "macOS", "15.6"], ["MacBook Air 13 (M3)", "macOS", "15.5"], ["Dell Latitude 5450", "Windows", "11 24H2"], ["Lenovo ThinkPad X1 Carbon G12", "Windows", "11 24H2"], ["Surface Laptop 7", "Windows", "11 23H2"], ["Dell Latitude 5420", "Windows", "10 22H2"]],
    desktop: [["Dell OptiPlex 7020", "Windows", "11 24H2"], ["Mac mini (M4)", "macOS", "15.6"]],
    mobile: [["iPhone 16", "iOS", "18.6"], ["iPhone 14", "iOS", "18.5"], ["Samsung Galaxy S25", "Android", "15"]],
    tablet: [["iPad Air (M3)", "iPadOS", "18.6"]],
    monitor: [["Dell U2724D", null, null], ["LG 27UN850", null, null]],
    peripheral: [["Jabra Evolve2 65", null, null], ["Logitech MX Keys", null, null]],
    server: [["HPE ProLiant DL380 Gen11", "Windows Server", "2022"]],
  } as const;
  const assetRows: (typeof schema.assets.$inferInsert)[] = [];
  let tagNo = 100;
  const allActive = insertedPeople.filter((p) => p.status === "active");
  for (const p of allActive) {
    const type = chance(0.85) ? "laptop" : "desktop";
    const m = pick(MODELS[type] as readonly (readonly [string, string | null, string | null])[]);
    const city = fullPeople.find((f) => f.id === p.id)!.officeLocation ?? "Hong Kong";
    const travelling = type === "laptop" && chance(0.12);
    const seenCity = travelling ? pick(["London", "Paris", "Bangkok", "Dubai", "Singapore"]) : city;
    const old = m[2]?.startsWith("10");
    assetRows.push({
      assetTag: `QI-${type === "laptop" ? "LT" : "DT"}-${String(tagNo++).padStart(4, "0")}`,
      name: `${p.displayName.split(" ")[0]}'s ${m[0]!.split(" ")[0]} ${m[0]!.split(" ")[1] ?? ""}`.trim(),
      type,
      model: m[0],
      serial: `${pick(["C02", "5CG", "PF4", "SN"])}${between(100000, 999999)}${pick(["X", "L", "Q"])}`,
      os: m[1],
      osVersion: m[2],
      ownerId: p.id,
      status: "in_use",
      compliance: old ? "non_compliant" : chance(0.08) ? "non_compliant" : "compliant",
      source: chance(0.9) ? "intune" : "defender",
      lastSeenAt: hoursAgo(between(0, 72)),
      lastSeenCity: seenCity,
      lastSeenCountry: CITY_COUNTRY[seenCity] ?? "HK",
      lastSeenIp: `${between(10, 220)}.${between(0, 255)}.${between(0, 255)}.${between(1, 254)}`,
      encrypted: !old || chance(0.5),
      purchaseDate: `202${between(2, 6)}-${String(between(1, 12)).padStart(2, "0")}-01`,
      cost: String(type === "laptop" ? between(1400, 2600) : between(900, 1600)),
      impact: pick(["low", "low", "medium", "high"]),
      usageType: chance(0.9) ? "permanent" : "loaner",
      department: p.department,
      managedById: byName(pick(["Marcus Tan", "Wei Chen", "Priya Sharma"])).id,
      managedByGroupId: gid("Endpoint & Devices"),
      assignedOn: daysAgo(between(30, 900)),
      endOfLife: old ? "2026-12-31" : null,
      vendor: m[0]!.startsWith("Mac") ? "Apple" : m[0]!.startsWith("Dell") ? "Dell" : m[0]!.startsWith("Lenovo") ? "Lenovo" : "Microsoft",
      warrantyExpiry: `202${between(6, 8)}-${String(between(1, 12)).padStart(2, "0")}-15`,
      domain: m[1] === "Windows" ? "QIGROUP" : "WORKGROUP",
      hostname: `${type === "laptop" ? "QI" : "DT"}${city.slice(0, 2).toUpperCase()}NB-${Math.random().toString(36).slice(2, 8).toUpperCase()}`,
      memoryGb: String(pick([8, 16, 16, 32])),
      diskGb: String(pick([256, 512, 512, 1024])),
      cpuGhz: String(pick([1.8, 2.4, 3.2, 3.5])),
      cpuCores: pick([4, 8, 8, 10, 12]),
      macAddress: Array.from({ length: 6 }, () => between(16, 255).toString(16).toUpperCase().padStart(2, "0")).join(":"),
      ipAddress: `10.${between(1, 3)}.${between(0, 255)}.${between(2, 254)}`,
      lastLoginBy: `${p.displayName.toLowerCase().replace(/\s+/g, ".")}@qigroup.com`,
      acknowledgedAt: chance(0.88) ? daysAgo(between(20, 800)) : null,
      createdAt: daysAgo(between(200, 1200)),
      updatedAt: hoursAgo(between(1, 72)),
    });
    if (chance(0.55)) {
      const mm = pick(MODELS.mobile);
      assetRows.push({ assetTag: `QI-MB-${String(tagNo++).padStart(4, "0")}`, name: `${p.displayName.split(" ")[0]}'s ${mm[0]}`, type: "mobile", model: mm[0], serial: `IMEI${between(100000000, 999999999)}`, os: mm[1], osVersion: mm[2], ownerId: p.id, status: "in_use", compliance: chance(0.9) ? "compliant" : "unknown", source: "intune", lastSeenAt: hoursAgo(between(0, 48)), lastSeenCity: seenCity, lastSeenCountry: CITY_COUNTRY[seenCity] ?? "HK", encrypted: true, purchaseDate: `202${between(3, 6)}-05-01`, cost: String(between(700, 1400)), department: p.department, managedById: byName("Marcus Tan").id, managedByGroupId: gid("Endpoint & Devices"), assignedOn: daysAgo(between(30, 700)), acknowledgedAt: chance(0.85) ? daysAgo(between(20, 600)) : null, vendor: mm[0]!.startsWith("iPhone") ? "Apple" : "Samsung" });
    }
  }
  for (let i = 0; i < 14; i++) {
    const m = pick(MODELS.laptop);
    assetRows.push({ assetTag: `QI-LT-${String(tagNo++).padStart(4, "0")}`, name: `Stock ${m[0]}`, type: "laptop", model: m[0], serial: `STK${between(100000, 999999)}`, os: m[1], osVersion: m[2], status: i < 11 ? "in_stock" : i < 13 ? "repair" : "retired", compliance: "unknown", source: "manual", lastSeenCity: "Hong Kong", lastSeenCountry: "HK", purchaseDate: "2025-11-01", cost: "1899" });
  }
  for (let i = 0; i < 20; i++) {
    const m = pick(MODELS.monitor);
    assetRows.push({ assetTag: `QI-MN-${String(tagNo++).padStart(4, "0")}`, name: m[0], type: "monitor", model: m[0], serial: `MN${between(100000, 999999)}`, ownerId: chance(0.8) ? pick(allActive).id : null, status: "in_use", compliance: "unknown", source: "manual", lastSeenCity: pick(OFFICES), purchaseDate: "2024-03-01", cost: "420" });
  }
  assetRows.push({ assetTag: "QI-SV-0001", name: "HK-DC-FS01", type: "server", model: MODELS.server[0][0], serial: "HPE-8821", os: "Windows Server", osVersion: "2022", status: "in_use", compliance: "compliant", source: "defender", lastSeenAt: hoursAgo(0), lastSeenCity: "Hong Kong", lastSeenCountry: "HK", lastSeenIp: "10.10.0.21", encrypted: true, purchaseDate: "2023-01-15", cost: "14200" });
  const insertedAssets = await db.insert(schema.assets).values(assetRows).returning({ id: schema.assets.id, type: schema.assets.type, os: schema.assets.os });
  // Assignment history: current assignment per owned device, plus one "returned but still assigned" edge case.
  const fullAssets = await db.select({ id: schema.assets.id, ownerId: schema.assets.ownerId, assignedOn: schema.assets.assignedOn, acknowledgedAt: schema.assets.acknowledgedAt, type: schema.assets.type }).from(schema.assets);
  const assignRows: (typeof schema.assetAssignments.$inferInsert)[] = [];
  for (const a of fullAssets) {
    if (!a.ownerId) continue;
    if (chance(0.3)) assignRows.push({ assetId: a.id, personId: pick(requesters).id, assignedAt: daysAgo(between(900, 1400)), acknowledgedAt: daysAgo(between(899, 1399)), returnedAt: daysAgo(between(400, 899)), note: "Returned on role change" });
    assignRows.push({ assetId: a.id, personId: a.ownerId, assignedAt: a.assignedOn ?? daysAgo(100), acknowledgedAt: a.acknowledgedAt });
  }
  await db.insert(schema.assetAssignments).values(assignRows);
  // Edge case for the portal: a device the requester already returned that IT has not yet unassigned.
  const returnedCandidate = fullAssets.find((a) => a.type === "mobile" && a.ownerId === requesters[0]?.id) ?? fullAssets.find((a) => a.type === "mobile" && a.ownerId);
  if (returnedCandidate) await db.update(schema.assets).set({ returnedAt: daysAgo(4), status: "in_use" }).where(sql`id = ${returnedCandidate.id}`);
  const asRows: (typeof schema.assetSoftware.$inferInsert)[] = [];
  for (const a of insertedAssets) {
    if (a.type !== "laptop" && a.type !== "desktop") continue;
    const base = ["Microsoft 365 Apps", "Microsoft Teams", "Microsoft Defender for Endpoint", "Google Chrome", "Cisco Secure Client", "7-Zip"];
    const optional = ["Adobe Acrobat Pro", "Adobe Creative Cloud", "Figma", "Zoom Workplace", "Slack", "Power BI Pro", "Visual Studio Code", "Java Runtime", "Notion", "TeamViewer", "Grammarly"];
    const names = [...base, ...optional.filter(() => chance(0.3))];
    for (const n of names) {
      const s = sw(n);
      const vs = versionsFor[n] ?? ["1.0"];
      asRows.push({ assetId: a.id, softwareId: s.id, version: pick(vs), status: s.licenceModel === "unlicensed" ? "in_review" : chance(0.15) ? "ignored" : chance(0.5) ? "managed" : "in_review", detectedAt: hoursAgo(between(1, 72)) });
    }
  }
  await db.insert(schema.assetSoftware).values(asRows);

  // ---------- Service catalogue ----------
  await db.insert(schema.services).values([
    { slug: "report-issue", name: "Report an issue", tagline: "Something is broken or not working as it should", icon: "alert-circle", kind: "incident", groupId: gid("Service Desk"), defaultPriority: "medium", eta: "First reply within 4 business hours", popular: true, fields: [{ key: "what", label: "What is happening?", type: "textarea", required: true, help: "What you were doing, what you expected, what happened instead." }, { key: "since", label: "Since when?", type: "select", options: ["Just now", "Today", "A few days", "Over a week"] }, { key: "blocking", label: "Is this stopping you from working?", type: "toggle" }] },
    { slug: "access-request", name: "Request access", tagline: "Get into a system, folder, mailbox or group", icon: "key-round", kind: "access", groupId: gid("Identity & Access"), defaultPriority: "medium", eta: "Usually same business day after approval", popular: true, fields: [{ key: "what", label: "What do you need access to?", type: "text", required: true, help: "Name it the way you know it — e.g. 'Finance shared drive', 'Salesforce reports'. We will map it." }, { key: "like", label: "Same access as a colleague?", type: "person", help: "Pick someone who already has what you need." }, { key: "why", label: "Why do you need it?", type: "textarea", required: true }] },
    { slug: "new-starter", name: "New starter", tagline: "Everything a new colleague needs, ready before day one", icon: "user-plus", kind: "onboarding", groupId: gid("Identity & Access"), defaultPriority: "high", eta: "Account ready 5 working days before joining", popular: true, fields: [{ key: "name", label: "Full name", type: "text", required: true }, { key: "join", label: "Start date", type: "date", required: true }, { key: "title", label: "Job title", type: "text", required: true }, { key: "dept", label: "Department", type: "select", required: true, options: DEPARTMENTS }, { key: "office", label: "Office", type: "select", required: true, options: OFFICES }, { key: "like", label: "Same access as", type: "person", required: true, help: "Clone access from someone in the same role." }, { key: "laptop", label: "Laptop preference", type: "select", options: ["Standard Windows", "MacBook", "No laptop needed"] }] },
    { slug: "leaver", name: "Leaver", tagline: "Schedule a secure, complete offboarding", icon: "user-minus", kind: "offboarding", groupId: gid("Identity & Access"), defaultPriority: "high", eta: "Access removed on last day, HR notified", fields: [{ key: "who", label: "Who is leaving?", type: "person", required: true }, { key: "last", label: "Last working day", type: "date", required: true }, { key: "mailbox", label: "Mailbox handling", type: "select", options: ["Forward to manager", "Auto-reply only", "Delete after 30 days"] }] },
    { slug: "hardware", name: "Hardware & equipment", tagline: "Laptop, monitor, phone, docking station, headset", icon: "laptop", kind: "request", groupId: gid("Endpoint & Devices"), defaultPriority: "medium", eta: "3–5 working days if in stock", popular: true, fields: [{ key: "item", label: "What do you need?", type: "select", required: true, options: ["Laptop", "Monitor", "Mobile phone", "Docking station", "Headset", "Keyboard & mouse", "Other"] }, { key: "why", label: "Reason", type: "textarea", required: true }, { key: "cc", label: "Cost centre", type: "text" }] },
    { slug: "software", name: "Software & licences", tagline: "Install an app or get a licence assigned", icon: "package", kind: "request", groupId: gid("Service Desk"), defaultPriority: "low", eta: "Same business day for catalogue apps", fields: [{ key: "app", label: "Application", type: "text", required: true }, { key: "why", label: "What will you use it for?", type: "textarea" }] },
    { slug: "mobile", name: "Mobile & telephony", tagline: "SIM, roaming, phone replacement", icon: "smartphone", kind: "request", groupId: gid("Endpoint & Devices"), defaultPriority: "medium", eta: "1–2 working days", fields: [{ key: "need", label: "What do you need?", type: "select", required: true, options: ["Roaming activation", "New SIM", "Replacement phone", "Number transfer"] }, { key: "dates", label: "Travel dates (if roaming)", type: "text" }] },
    { slug: "security", name: "Report something suspicious", tagline: "Phishing, lost device, unusual activity", icon: "shield-alert", kind: "incident", groupId: gid("Service Desk"), defaultPriority: "urgent", eta: "Immediate triage, 24×7", fields: [{ key: "what", label: "What happened?", type: "textarea", required: true }, { key: "clicked", label: "Did you click a link or enter a password?", type: "toggle" }] },
    { slug: "guest-wifi", name: "Guest Wi-Fi", tagline: "Temporary network access for visitors", icon: "wifi", kind: "request", groupId: gid("Network & Infrastructure"), defaultPriority: "low", eta: "Within the hour", fields: [{ key: "names", label: "Visitor names", type: "textarea", required: true }, { key: "from", label: "From", type: "date", required: true }, { key: "to", label: "To", type: "date", required: true }] },
    { slug: "other", name: "Something else", tagline: "Not sure where it fits? Start here.", icon: "message-circle", kind: "request", groupId: gid("Service Desk"), defaultPriority: "low", eta: "First reply within one business day", fields: [{ key: "what", label: "Tell us what you need", type: "textarea", required: true }] },
  ]);

  // ---------- Onboardings, access grants ----------
  const mkTasks = (isOff: boolean): typeof schema.onboardings.$inferInsert["tasks"] =>
    isOff
      ? [
          { key: "hr-confirm", label: "HR confirms last day", owner: "HR", status: "done", dueOffsetDays: -10 },
          { key: "manager-handover", label: "Manager confirms handover & mailbox handling", owner: "Manager", status: "done", dueOffsetDays: -5 },
          { key: "devices", label: "Devices returned and wiped", owner: "Endpoint & Devices", status: "in_progress", dueOffsetDays: 0 },
          { key: "disable", label: "Disable sign-in, revoke sessions", owner: "Identity & Access", status: "todo", dueOffsetDays: 0 },
          { key: "groups", label: "Remove 9 access grants", owner: "Identity & Access", status: "todo", dueOffsetDays: 0 },
          { key: "licences", label: "Reassign 3 licences", owner: "Identity & Access", status: "todo", dueOffsetDays: 1 },
          { key: "hr-notify", label: "Notify HR of completion", owner: "TicketFly", status: "todo", dueOffsetDays: 1 },
        ]
      : [
          { key: "hr-request", label: "HR raises new starter", owner: "HR", status: "done", dueOffsetDays: -15 },
          { key: "clone", label: "Clone access from reference colleague", owner: "Identity & Access", status: "done", dueOffsetDays: -7 },
          { key: "account", label: "Create Entra account", owner: "Identity & Access", status: "done", dueOffsetDays: -5 },
          { key: "licences", label: "Assign licences (M365 E3, Defender, Adobe Acrobat)", owner: "Identity & Access", status: "in_progress", dueOffsetDays: -5 },
          { key: "laptop", label: "Prepare and ship laptop", owner: "Endpoint & Devices", status: "in_progress", dueOffsetDays: -3 },
          { key: "manager-brief", label: "Manager confirms first-week plan", owner: "Manager", status: "todo", dueOffsetDays: -2 },
          { key: "activate", label: "Day-one activation & welcome pack", owner: "TicketFly", status: "todo", dueOffsetDays: 0 },
        ];
  const allTickets = await db.select({ id: schema.tickets.id, kind: schema.tickets.kind, subject: schema.tickets.subject }).from(schema.tickets);
  for (const p of onboardingPeople) {
    const full = fullPeople.find((f) => f.id === p.id)!;
    const isOff = p.status === "offboarding";
    const t = allTickets.find((t) => (t.kind === "onboarding" || t.kind === "offboarding") && t.subject.includes(p.displayName));
    await db.insert(schema.onboardings).values({
      personId: p.id,
      ticketId: t?.id ?? null,
      kind: isOff ? "offboarding" : "onboarding",
      joinDate: (isOff ? full.leaveDate : full.joinDate)!,
      cloneFromPersonId: isOff ? null : pick(requesters.filter((r) => r.department === p.department)).id,
      stage: isOff ? "provisioning" : p.displayName === "Amira Farouk" ? "ready" : "provisioning",
      tasks: mkTasks(isOff),
      createdAt: daysAgo(between(5, 14)),
    });
  }
  const grantCatalog = [
    ["Microsoft 365", "Email & Office apps", "LIC-M365-E3", "36.00"],
    ["Microsoft 365", "Defender for Endpoint", "LIC-MDE-P2", "5.20"],
    ["Entra ID", "All staff", "grp-all-staff", "0"],
    ["Entra ID", "VPN users", "grp-vpn-users", "0"],
    ["SharePoint", "Department site", "sp-dept-site", "0"],
    ["Salesforce", "Sales Cloud user", "LIC-SFDC-SC", "80.00"],
    ["Adobe", "Acrobat Pro", "LIC-ADOBE-ACRO", "19.99"],
    ["Power BI", "Pro licence", "LIC-PBI-PRO", "10.00"],
    ["Zoom", "Licensed host", "LIC-ZOOM-PRO", "13.33"],
    ["Finance drive", "Read/write", "grp-fin-rw", "0"],
    ["HR system", "Manager self-service", "grp-hr-mss", "0"],
    ["Slack", "Member", "LIC-SLACK", "8.75"],
  ] as const;
  const grantRows: (typeof schema.accessGrants.$inferInsert)[] = [];
  for (const p of [...onboardingPeople, ...requesters.slice(0, 30)]) {
    const n = between(4, 9);
    const chosen = [...grantCatalog].sort(() => rand() - 0.5).slice(0, n);
    for (const g of chosen) grantRows.push({ personId: p.id, system: g[0], displayName: g[1], internalName: g[2], monthlyCost: g[3], grantedAt: daysAgo(between(30, 900)) });
  }
  await db.insert(schema.accessGrants).values(grantRows);


  // ---------- Workspaces (Freshservice parity) ----------
  await db.insert(schema.workspaces).values([
    { name: "IT Division", slug: "it", primary: true, icon: "monitor" },
    { name: "Finance", slug: "finance", icon: "banknote" },
    { name: "Project Work Request", slug: "pwr", icon: "kanban" },
    { name: "Global Operation", slug: "globalops", icon: "globe" },
    { name: "Strategic Initiatives Portal", slug: "sip", icon: "shield" },
  ]);

  // ---------- Solutions (knowledge base) ----------
  const folderSpec: [string, string][] = [
    ["Getting Started", "Onboarding / Offboarding"], ["Getting Started", "Our Offices"], ["End User Guides", "Microsoft"], ["End User Guides", "FAQ"], ["End User Guides", "Employee Mobilephone support"],
    ["Technical User Guides (How?)", "Desk Phone"], ["Technical User Guides (How?)", "Asset Management"], ["Technical Troubleshooting (Why?)", "Solutions"], ["Microsoft 365 Defender", "Security Operation"], ["Microsoft Intune Manager", "Device Management"],
    ["Runbook", "IT Division Escalation Point"], ["Authentication Method", "Global Secure Access"], ["Finance Application", "Esker"], ["Finance Application", "COMPLAN"], ["Apps Knowledge Hub", "Customer Facing Concerns"],
  ];
  const folders = await db.insert(schema.kbFolders).values(folderSpec.map(([category, name]) => ({ category, name }))).returning();
  const fid = (n: string) => folders.find((f) => f.name === n)!.id;
  const authors = ["Wei Chen", "Priya Sharma", "Marcus Tan", "Siti Abdullah", "Daniel Lim", "Nada Haddad"].map(byName);
  const articleSpec: [string, string, string][] = [
    ["IP Phone - HitchOn Yealink SIP-T33G Full user manual", "Desk Phone", "published"], ["Wireless ScreenCastingKit WPD-900 Guide", "FAQ", "published"], ["360AI WebcamSpeakerPhone JVU368 Guide", "FAQ", "published"], ["Mobile Device Troubleshooting", "FAQ", "published"],
    ["Basic Troubleshooting for Your Mobile Device (Android & iOS)", "Employee Mobilephone support", "published"], ["UBS Installation & Configuration (End User View)", "Esker", "published"], ["Laptop & Desktop Assessment Guide", "Asset Management", "published"], ["How to Recall an Email in Microsoft Outlook 365", "Microsoft", "published"],
    ["Guide to MAP Shared Mailbox in Outlook", "Microsoft", "published"], ["[Teams Bot] VCON Vihaan ID Redemption Capping", "Customer Facing Concerns", "published"], ["On Boarding Process", "Onboarding / Offboarding", "published"], ["USE OF COMPANY PORTAL", "Microsoft", "published"],
    ["Off Boarding Process", "Onboarding / Offboarding", "published"], ["Our Offices", "Our Offices", "published"], ["Secureboot Update Guide", "Solutions", "published"], ["Shared Mailbox Accessibility When the Associated AD Account Is Disabled", "Solutions", "published"],
    ["Unable to Access On-Prem AD & Exchange Hybrid While Working Remotely", "Solutions", "published"], ["Adobe Acrobat Launch Failure", "Microsoft", "published"], ["Cannot Expand Shared Mailbox Folder in Outlook", "Microsoft", "published"], ["COMPLAN - Service Request User Guide", "COMPLAN", "draft"],
    ["Battery Charging Stuck at ~80% on Microsoft Surface Devices", "Solutions", "published"], ["Defender for Endpoint: responding to a high-severity alert", "Security Operation", "published"], ["Intune: enrolling a personal iPhone (BYOD)", "Device Management", "published"], ["Intune: wiping a lost or stolen laptop", "Device Management", "published"],
    ["Escalation matrix — who to call after hours", "IT Division Escalation Point", "published"], ["Global Secure Access: first-time sign-in", "Global Secure Access", "published"], ["Setting up MFA with Microsoft Authenticator", "Microsoft", "published"], ["VPN: Cisco Secure Client on macOS", "Microsoft", "published"],
    ["Requesting a new laptop or replacement", "Asset Management", "published"], ["Meeting room screens in HK and KL", "FAQ", "published"], ["Printing from a personal device", "FAQ", "draft"], ["Phishing: what to do if you clicked", "Security Operation", "published"],
  ];
  await db.insert(schema.kbArticles).values(
    articleSpec.map(([title, folder, status], i) => ({
      folderId: fid(folder),
      title,
      body: `## ${title}\n\nThis article was migrated from Freshservice Solutions. Steps and screenshots are preserved in the archive; content is reviewed on the schedule shown in Admin → Knowledge Base.\n\n1. Open the relevant application.\n2. Follow the on-screen prompts described below.\n3. If the issue persists, raise a ticket and mention this article.`,
      status,
      authorId: authors[i % authors.length]!.id,
      views: chance(0.6) ? 0 : between(1, 40),
      helpful: chance(0.85) ? 0 : between(1, 3),
      notHelpful: 0,
      insertedInTickets: chance(0.8) ? 0 : between(1, 6),
      reviewDue: chance(0.2) ? "2026-08-15" : "2027-01-31",
      updatedAt: daysAgo(between(5, 400)),
      createdAt: daysAgo(between(400, 1100)),
    })),
  );

  // ---------- Contracts & purchase orders ----------
  await db.insert(schema.contracts).values([
    { name: "Microsoft 365 E3 — enterprise agreement", vendor: "Microsoft", type: "software", status: "active", startDate: "2025-07-01", endDate: "2028-06-30", cost: "181440", billing: "annual", ownerId: byName("Ked Mardemootoo").id, licences: 420 },
    { name: "Adobe Creative Cloud for teams", vendor: "Adobe", type: "software", status: "active", startDate: "2026-01-15", endDate: "2027-01-14", cost: "12958", billing: "annual", ownerId: byName("Nada Haddad").id, licences: 18 },
    { name: "Salesforce Sales Cloud", vendor: "Salesforce", type: "software", status: "active", startDate: "2025-10-01", endDate: "2026-09-30", cost: "43200", billing: "annual", ownerId: byName("Nada Haddad").id, licences: 45, notes: "Renewal quote due 1 Sep" },
    { name: "Dell ProSupport Plus — laptops", vendor: "Dell", type: "warranty", status: "active", startDate: "2024-03-01", endDate: "2027-02-28", cost: "9800", billing: "one-off", ownerId: byName("Marcus Tan").id },
    { name: "Cisco SmartNet — HK core switches", vendor: "Cisco", type: "maintenance", status: "expiring", startDate: "2023-09-15", endDate: "2026-09-14", cost: "6400", billing: "annual", ownerId: byName("Daniel Lim").id },
    { name: "Freshservice — Enterprise", vendor: "Freshworks", type: "software", status: "expiring", startDate: "2025-12-01", endDate: "2026-11-30", cost: "100000", billing: "annual", ownerId: byName("Nada Haddad").id, licences: 70, notes: "Not renewing — replaced by TicketFly" },
    { name: "Zoom Workplace Business", vendor: "Zoom", type: "software", status: "expired", startDate: "2024-06-01", endDate: "2026-05-31", cost: "12800", billing: "annual", ownerId: byName("Priya Sharma").id, licences: 80 },
  ]);
  await db.insert(schema.purchaseOrders).values([
    { number: "PO-2026-0412", vendor: "Dell Technologies", status: "received", total: "18990", orderedAt: "2026-07-02", expectedAt: "2026-07-20", receivedAt: "2026-07-18", requesterId: byName("Marcus Tan").id, items: [{ name: "Latitude 5450", qty: 10, unit: 1899 }] },
    { number: "PO-2026-0455", vendor: "Apple (HK)", status: "ordered", total: "11996", orderedAt: "2026-08-12", expectedAt: "2026-09-02", requesterId: byName("Marcus Tan").id, items: [{ name: "MacBook Pro 14 (M4)", qty: 4, unit: 2999 }] },
    { number: "PO-2026-0461", vendor: "Jabra", status: "ordered", total: "5400", orderedAt: "2026-08-19", expectedAt: "2026-08-29", requesterId: byName("Wei Chen").id, items: [{ name: "Evolve2 65", qty: 30, unit: 180 }] },
    { number: "PO-2026-0398", vendor: "LG Electronics", status: "received", total: "8400", orderedAt: "2026-06-10", expectedAt: "2026-06-30", receivedAt: "2026-06-28", requesterId: byName("Marcus Tan").id, items: [{ name: "27UN850 monitor", qty: 20, unit: 420 }] },
    { number: "PO-2026-0470", vendor: "Adobe", status: "pending_approval", total: "1440", orderedAt: "2026-08-24", requesterId: byName("Priya Sharma").id, items: [{ name: "Acrobat Pro seat (annual)", qty: 6, unit: 240 }] },
  ]);


  // ---------- Problems ----------
  const openTickets = await db.select({ id: schema.tickets.id, subject: schema.tickets.subject, categoryId: schema.tickets.categoryId }).from(schema.tickets).where(sql`${schema.tickets.status} in ('open','in_progress','pending')`);
  const byCat = (name: string, n: number) => openTickets.filter((t) => t.categoryId === cat(name)).slice(0, n).map((t) => t.id);
  const problemRows = await db
    .insert(schema.problems)
    .values([
      { title: "VPN drops for remote users after Cisco Secure Client 5.1.9", description: "Multiple users report the tunnel dropping every 20–40 minutes since the client auto-updated. Reproducible on Windows 11 24H2 with Wi-Fi 6E adapters.", status: "known_error", priority: "high", impact: "high", assigneeId: byName("Daniel Lim").id, groupId: gid("Network & Infrastructure"), categoryId: cat("Network"), rootCause: "DTLS keepalive regression in 5.1.9 when the adapter enters power-save.", workaround: "Disable adapter power management, or pin client 5.1.6 via Intune ring 'Stable'.", createdAt: daysAgo(9), updatedAt: hoursAgo(5) },
      { title: "Outlook repeatedly prompts for credentials on shared mailboxes", description: "Users with 3+ shared mailboxes get modern-auth prompts every few hours.", status: "open", priority: "medium", impact: "medium", assigneeId: byName("Priya Sharma").id, groupId: gid("Service Desk"), categoryId: cat("Email & Collaboration"), workaround: "Remove and re-add the shared mailbox; clear Credential Manager entries.", createdAt: daysAgo(14), updatedAt: daysAgo(1) },
      { title: "Printer 12/F offline after firmware update", description: "HP MFP on 12/F loses network after the vendor's July firmware; recurs after every restart.", status: "resolved", priority: "medium", impact: "low", assigneeId: byName("Wei Chen").id, groupId: gid("Service Desk"), categoryId: cat("Printing"), rootCause: "Firmware enabled IPv6-only discovery; DHCPv6 not offered on that VLAN.", permanentFix: "Static IPv4 + firmware rollback; vendor case open.", createdAt: daysAgo(40), updatedAt: daysAgo(6), resolvedAt: daysAgo(6) },
      { title: "Adobe Acrobat licence expired message for named users", description: "Named-user licences show as expired despite active seats in the admin console.", status: "open", priority: "low", impact: "low", assigneeId: byName("Siti Abdullah").id, groupId: gid("Identity & Access"), categoryId: cat("Licences"), createdAt: daysAgo(3), updatedAt: hoursAgo(20) },
    ])
    .returning({ id: schema.problems.id });
  const pi: (typeof schema.problemIncidents.$inferInsert)[] = [];
  [["Network", 4], ["Email & Collaboration", 3], ["Printing", 2], ["Licences", 2]].forEach(([c, n], i) => byCat(c as string, n as number).forEach((tid) => pi.push({ problemId: problemRows[i]!.id, ticketId: tid })));
  if (pi.length) await db.insert(schema.problemIncidents).values(pi);
  for (const link of pi) await db.update(schema.tickets).set({ problemId: link.problemId }).where(sql`id = ${link.ticketId}`);

  // ---------- Changes & releases ----------
  const approvers = (names: string[], decision: "pending" | "approved" | "rejected" = "pending") => names.map((n) => ({ personId: byName(n).id, name: n, decision, ...(decision !== "pending" ? { at: daysAgo(1).toISOString() } : {}) }));
  const rel = await db
    .insert(schema.itReleases)
    .values([
      { name: "Windows 11 24H2 wave 2", description: "Second ring: Finance and Operations laptops.", status: "scheduled", version: "24H2", ownerId: byName("Marcus Tan").id, plannedStart: daysAgo(-10), plannedEnd: daysAgo(-3) },
      { name: "Network refresh HK office", description: "Core switch replacement and Wi-Fi 6E APs on 12/F and 14/F.", status: "planning", ownerId: byName("Daniel Lim").id, plannedStart: daysAgo(-24), plannedEnd: daysAgo(-22) },
      { name: "August patch Tuesday", description: "Monthly OS and Office updates.", status: "deployed", ownerId: byName("Marcus Tan").id, plannedStart: daysAgo(13), plannedEnd: daysAgo(12) },
    ])
    .returning({ id: schema.itReleases.id });
  const changeRows = await db
    .insert(schema.changes)
    .values([
      { title: "VPN gateway firmware upgrade", description: "Upgrade both HK ASA gateways to 9.20.3 during the Saturday window.", reason: "Vendor fix for DTLS keepalive regression (PRB VPN drops).", type: "normal", status: "awaiting_approval", risk: "medium", impact: "high", priority: "high", requesterId: byName("Daniel Lim").id, assigneeId: byName("Daniel Lim").id, groupId: gid("Network & Infrastructure"), plannedStart: new Date("2026-08-30T22:00:00+08:00"), plannedEnd: new Date("2026-08-31T01:00:00+08:00"), rollbackPlan: "Boot previous image from flash; 15 min.", testPlan: "Tunnel from HK, KL and Dubai; 30-minute soak.", approvals: approvers(["Nada Haddad", "Ked Mardemootoo"]), createdAt: daysAgo(5), updatedAt: hoursAgo(8) },
      { title: "Pin Cisco Secure Client 5.1.6 via Intune ring Stable", description: "Roll back the client on all managed Windows laptops until the gateway fix lands.", type: "standard", status: "in_progress", risk: "low", impact: "medium", priority: "high", requesterId: byName("Daniel Lim").id, assigneeId: byName("Marcus Tan").id, groupId: gid("Endpoint & Devices"), plannedStart: daysAgo(2), plannedEnd: daysAgo(-1), rollbackPlan: "Remove the assignment; clients self-update.", approvals: [], affectedAssetIds: [], createdAt: daysAgo(3), updatedAt: hoursAgo(3) },
      { title: "Enable Windows Hello for Business for Finance", description: "Policy rollout to the Finance dynamic group; 60 devices.", type: "normal", status: "approved", risk: "low", impact: "medium", priority: "medium", requesterId: byName("Siti Abdullah").id, assigneeId: byName("Marcus Tan").id, groupId: gid("Endpoint & Devices"), plannedStart: daysAgo(-4), plannedEnd: daysAgo(-4), approvals: approvers(["Nada Haddad"], "approved"), releaseId: rel[0]!.id, createdAt: daysAgo(8), updatedAt: daysAgo(1) },
      { title: "Emergency: revoke compromised service account", description: "Defender flagged credential theft on svc-backup; rotate and re-scope.", type: "emergency", status: "completed", risk: "high", impact: "high", priority: "urgent", requesterId: byName("Ked Mardemootoo").id, assigneeId: byName("Siti Abdullah").id, groupId: gid("Identity & Access"), plannedStart: daysAgo(6, 2), plannedEnd: daysAgo(6), approvals: approvers(["Nada Haddad"], "approved"), createdAt: daysAgo(6, 3), updatedAt: daysAgo(6), completedAt: daysAgo(6) },
      { title: "Replace core switch HK 12/F", description: "Swap Catalyst 9300 stack; requires floor outage.", type: "normal", status: "planning", risk: "high", impact: "high", priority: "medium", requesterId: byName("Daniel Lim").id, assigneeId: byName("Daniel Lim").id, groupId: gid("Network & Infrastructure"), plannedStart: daysAgo(-24), plannedEnd: daysAgo(-24, -6), rollbackPlan: "Re-rack old stack; config backup on TFTP.", approvals: [], releaseId: rel[1]!.id, createdAt: daysAgo(2), updatedAt: hoursAgo(30) },
      { title: "August patch Tuesday deployment", description: "Ring 0 → 1 → 2 over 5 days.", type: "standard", status: "closed", risk: "low", impact: "medium", priority: "medium", requesterId: byName("Marcus Tan").id, assigneeId: byName("Marcus Tan").id, groupId: gid("Endpoint & Devices"), plannedStart: daysAgo(13), plannedEnd: daysAgo(8), approvals: [], releaseId: rel[2]!.id, createdAt: daysAgo(15), updatedAt: daysAgo(8), completedAt: daysAgo(8) },
    ])
    .returning({ id: schema.changes.id });
  await db.update(schema.problems).set({ changeId: changeRows[0]!.id }).where(sql`id = ${problemRows[0]!.id}`);

  // ---------- Tasks ----------
  const taskRows: (typeof schema.tasks.$inferInsert)[] = [
    { title: "Confirm outage window with Finance leads", status: "done", assigneeId: byName("Daniel Lim").id, parentType: "change", parentId: changeRows[0]!.id, dueAt: daysAgo(1), completedAt: daysAgo(1) },
    { title: "Stage 9.20.3 image on both gateways", status: "in_progress", assigneeId: byName("Daniel Lim").id, parentType: "change", parentId: changeRows[0]!.id, dueAt: daysAgo(-2) },
    { title: "Post maintenance notice on status page", status: "open", assigneeId: byName("Wei Chen").id, parentType: "change", parentId: changeRows[0]!.id, dueAt: daysAgo(-3) },
    { title: "Collect adapter models from affected users", status: "done", assigneeId: byName("Priya Sharma").id, parentType: "problem", parentId: problemRows[0]!.id, dueAt: daysAgo(4), completedAt: daysAgo(5) },
    { title: "Raise vendor case with Cisco TAC", status: "done", assigneeId: byName("Daniel Lim").id, parentType: "problem", parentId: problemRows[0]!.id, dueAt: daysAgo(6), completedAt: daysAgo(7) },
    { title: "Reproduce credential prompt with 3 shared mailboxes", status: "open", assigneeId: byName("Priya Sharma").id, parentType: "problem", parentId: problemRows[1]!.id, dueAt: daysAgo(-1) },
    { title: "Order 2× Catalyst 9300 (PO)", status: "in_progress", assigneeId: byName("Daniel Lim").id, parentType: "change", parentId: changeRows[4]!.id, dueAt: daysAgo(-5) },
    { title: "Ship MacBook to Dubai (Elena Petrova)", status: "open", assigneeId: byName("Marcus Tan").id, parentType: "journey", parentId: 1, dueAt: daysAgo(-3) },
    { title: "Assign Adobe Acrobat licence (Kai Ho)", status: "open", assigneeId: byName("Siti Abdullah").id, parentType: "journey", parentId: 2, dueAt: daysAgo(-2) },
    { title: "Collect laptop and badge (Tomas Novak)", status: "open", assigneeId: byName("Marcus Tan").id, parentType: "journey", parentId: 4, dueAt: daysAgo(-3) },
    { title: "Chase Zoom renewal quote", status: "open", assigneeId: byName("Priya Sharma").id, parentType: "ticket", parentId: inserted[220]!.id, dueAt: daysAgo(-4) },
    { title: "Call back requester about docking station", status: "open", assigneeId: byName("Wei Chen").id, parentType: "ticket", parentId: inserted[230]!.id, dueAt: hoursAgo(-3) },
    { title: "Wipe returned iPhone before restock", status: "open", assigneeId: byName("Marcus Tan").id, parentType: "ticket", parentId: inserted[240]!.id, dueAt: daysAgo(1) },
  ];
  await db.insert(schema.tasks).values(taskRows);

  // ---------- IT Operations ----------
  await db.insert(schema.alerts).values([
    { source: "defender", severity: "high", title: "Credential theft attempt — svc-backup", resource: "HK-DC-FS01", detail: "LSASS memory access from unsigned binary. Device isolated automatically.", status: "resolved", firedAt: daysAgo(6, 4), acknowledgedAt: daysAgo(6, 3.5), resolvedAt: daysAgo(6) },
    { source: "azure_monitor", severity: "medium", title: "VPN gateway CPU > 85% for 15 min", resource: "hk-asa-01", detail: "Sustained CPU during peak login window.", status: "acknowledged", firedAt: hoursAgo(6), acknowledgedAt: hoursAgo(5.5) },
    { source: "defender", severity: "medium", title: "Unlicensed remote-access tool detected", resource: "QIKLNB-PF3D366K", detail: "TeamViewer 15.68.5 installed by user. Policy: block.", status: "new", firedAt: hoursAgo(2) },
    { source: "intune", severity: "low", title: "12 devices non-compliant: BitLocker off", resource: "Compliance policy — Windows baseline", detail: "Devices outside grace period.", status: "new", firedAt: hoursAgo(9) },
    { source: "azure_monitor", severity: "high", title: "File server disk 92% — HK-DC-FS01 D:", resource: "HK-DC-FS01", detail: "Growth 4 GB/day; 6 days to full.", status: "new", firedAt: hoursAgo(1) },
    { source: "defender", severity: "low", title: "Phishing campaign: 14 recipients in Finance", resource: "Exchange Online", detail: "Subject 'Invoice overdue — action required'. Zero-hour purge applied.", status: "resolved", firedAt: daysAgo(2), acknowledgedAt: daysAgo(2), resolvedAt: daysAgo(2) },
  ]);
  await db.insert(schema.itServices).values([
    { name: "Email & calendar (Microsoft 365)", health: "operational", ownerId: byName("Priya Sharma").id },
    { name: "VPN (Cisco Secure Client)", health: "degraded", ownerId: byName("Daniel Lim").id, maintenanceFrom: new Date("2026-08-30T22:00:00+08:00"), maintenanceTo: new Date("2026-08-31T01:00:00+08:00"), maintenanceNote: "Gateway firmware upgrade — connections will drop briefly." },
    { name: "Office Wi-Fi (HK, KL, SG)", health: "operational", ownerId: byName("Daniel Lim").id },
    { name: "Salesforce", health: "operational", ownerId: byName("Nada Haddad").id },
    { name: "File shares (HK-DC-FS01)", health: "operational", ownerId: byName("Ked Mardemootoo").id },
    { name: "Printing", health: "operational", ownerId: byName("Wei Chen").id },
    { name: "Service Desk (this portal)", health: "operational", ownerId: byName("Damien Fleury").id },
  ]);

  // ---------- Projects (grid) ----------
  const proj = await db
    .insert(schema.projects)
    .values([
      { name: "Freshservice → Service Desk migration", description: "Cutover plan, data import, training, decommission.", status: "active", ownerId: byName("Nada Haddad").id, startDate: "2026-08-01", endDate: "2026-11-30" },
      { name: "HK office network refresh", description: "Core switches, Wi-Fi 6E, new SD-WAN.", status: "active", ownerId: byName("Daniel Lim").id, startDate: "2026-09-01", endDate: "2026-10-15" },
      { name: "QVI ticket tracker (from Smartsheet)", description: "Pilot: QVI's request tracking on the grid, replacing their Smartsheet.", status: "planning", ownerId: byName("Damien Fleury").id, startDate: "2026-10-01", endDate: "2026-12-15", workspace: "qvi" },
    ])
    .returning({ id: schema.projects.id });
  const rows1: [string, string, string, string, string, number, number | null][] = [
    ["Discovery & sizing", "done", "Damien Fleury", "2026-08-01", "2026-08-15", 100, null],
    ["Architecture brief signed off", "done", "Nada Haddad", "2026-08-20", "2026-08-26", 100, 0],
    ["Freshservice export", "in_progress", "Damien Fleury", "2026-08-27", "2026-09-05", 40, null],
    ["Obtain API key + plan tier", "done", "Ked Mardemootoo", "2026-08-27", "2026-08-28", 100, 2],
    ["Crawl tickets + conversations", "in_progress", "Damien Fleury", "2026-08-29", "2026-09-03", 30, 2],
    ["Attachments to Blob", "not_started", "Damien Fleury", "2026-09-03", "2026-09-05", 0, 2],
    ["Reconcile counts vs CSV export", "not_started", "Wei Chen", "2026-09-05", "2026-09-05", 0, 2],
    ["Azure environment", "in_progress", "Ked Mardemootoo", "2026-09-01", "2026-09-12", 20, null],
    ["Resource group + Postgres", "in_progress", "Ked Mardemootoo", "2026-09-01", "2026-09-04", 50, 7],
    ["Entra app registrations", "not_started", "Ked Mardemootoo", "2026-09-04", "2026-09-08", 0, 7],
    ["ADO pipeline (WIF)", "not_started", "Damien Fleury", "2026-09-08", "2026-09-12", 0, 7],
    ["Agent training", "not_started", "Nada Haddad", "2026-10-06", "2026-10-10", 0, null],
    ["Cutover weekend", "not_started", "Nada Haddad", "2026-10-17", "2026-10-19", 0, null],
    ["Decommission Freshservice", "not_started", "Ked Mardemootoo", "2026-11-30", "2026-11-30", 0, null],
  ];
  const rows2: [string, string, string, string, string, number, number | null][] = [
    ["Site survey 12/F + 14/F", "done", "Daniel Lim", "2026-09-01", "2026-09-03", 100, null],
    ["Order switches (PO)", "in_progress", "Daniel Lim", "2026-09-02", "2026-09-10", 60, null],
    ["Change request + CAB", "not_started", "Daniel Lim", "2026-09-12", "2026-09-16", 0, null],
    ["Cutover night", "not_started", "Daniel Lim", "2026-09-20", "2026-09-20", 0, null],
    ["AP install 14/F", "not_started", "Marcus Tan", "2026-09-22", "2026-09-26", 0, null],
    ["Post-change review", "not_started", "Nada Haddad", "2026-10-01", "2026-10-01", 0, null],
  ];
  const rows3: [string, string, string, string, string, number, number | null][] = [
    ["Map Smartsheet columns → grid", "in_progress", "Damien Fleury", "2026-10-01", "2026-10-03", 20, null],
    ["Import current sheet", "not_started", "Damien Fleury", "2026-10-06", "2026-10-07", 0, null],
    ["QVI walkthrough", "not_started", "Nada Haddad", "2026-10-10", "2026-10-10", 0, null],
  ];
  for (const [pIdx, rows] of [[0, rows1], [1, rows2], [2, rows3]] as const) {
    const ids: number[] = [];
    for (let i = 0; i < rows.length; i++) {
      const [title, status, owner, start, end, pct, parentIdx] = rows[i]!;
      const [r] = await db.insert(schema.projectRows).values({ projectId: proj[pIdx]!.id, position: i, parentId: parentIdx === null ? null : ids[parentIdx] ?? null, title, status, ownerId: byName(owner).id, startDate: start, endDate: end, percent: pct, priority: pct === 100 ? "low" : i % 3 === 0 ? "high" : "medium" }).returning({ id: schema.projectRows.id });
      ids.push(r!.id);
    }
  }

  // ---------- Notifications ----------
  const wei = byName("Wei Chen").id;
  await db.insert(schema.notifications).values([
    { personId: wei, kind: "assignment", title: "Ticket assigned to you", body: "Slow performance after Windows update — Yuki Lim", href: `/tickets/${inserted[250]!.id}`, createdAt: hoursAgo(1) },
    { personId: wei, kind: "sla", title: "First response due in 30 min", body: "Access to Finance shared drive", href: `/tickets/${inserted[251]!.id}`, createdAt: hoursAgo(2) },
    { personId: wei, kind: "task", title: "Task due today", body: "Post maintenance notice on status page", href: "/tasks", createdAt: hoursAgo(4) },
    { personId: wei, kind: "mention", title: "Priya mentioned you", body: "\"@Wei can you take the printer one on 12/F?\"", href: "/tickets", readAt: hoursAgo(20), createdAt: hoursAgo(22) },
    { personId: wei, kind: "release", title: "Service Desk 0.3.0 deployed", body: "Modules: Problems, Changes, Releases, Tasks, IT Ops, Projects, Reporting", href: "/admin/releases", readAt: daysAgo(1), createdAt: daysAgo(1) },
    { personId: byName("Nada Haddad").id, kind: "approval", title: "Approval requested", body: "VPN gateway firmware upgrade — Saturday 22:00", href: `/changes/${changeRows[0]!.id}`, createdAt: hoursAgo(8) },
    { personId: byName("Ked Mardemootoo").id, kind: "approval", title: "Approval requested", body: "VPN gateway firmware upgrade — Saturday 22:00", href: `/changes/${changeRows[0]!.id}`, createdAt: hoursAgo(8) },
  ]);

  // ---------- Releases ----------
  await db.insert(schema.releases).values([
    { version: "0.1.0", bump: "minor", environment: "dev", commitSha: "a41f2c9", releasedAt: daysAgo(12), notes: "Foundation: schema, activity log, release tracking, pipeline gate.", changes: [{ type: "feat", scope: "core", subject: "SLA business-hours clock" }, { type: "feat", scope: "db", subject: "ticket, people, asset schema" }, { type: "chore", scope: "ci", subject: "lint → test → build → deploy" }] },
    { version: "0.2.0", bump: "minor", environment: "dev", commitSha: "b73e01d", releasedAt: daysAgo(8), notes: "Freshservice import with legacy references and /fs redirects.", changes: [{ type: "feat", scope: "import", subject: "Freshservice crawler with resumable checkpoints" }, { type: "feat", scope: "tickets", subject: "legacy_ref lookup and redirect" }, { type: "fix", scope: "import", subject: "attachment URLs expire — download during crawl" }] },
    { version: "0.2.1", bump: "patch", environment: "dev", commitSha: "c9a77b2", releasedAt: daysAgo(6), notes: "Import fidelity fixes.", changes: [{ type: "fix", scope: "import", subject: "conversation pagination beyond 30 notes" }, { type: "perf", scope: "search", subject: "GIN index on legacy refs" }] },
    { version: "0.3.0", bump: "minor", environment: "dev", commitSha: "d12ff40", releasedAt: daysAgo(3), notes: "Agent inbox, ticket view, requester portal.", changes: [{ type: "feat", scope: "inbox", subject: "queue with saved views and keyboard navigation" }, { type: "feat", scope: "portal", subject: "service catalogue and request tracking" }, { type: "feat", scope: "settings", subject: "activity log, releases, status" }] },
    { version: "0.3.0", bump: "minor", environment: "dev", commitSha: "f0a12c4", releasedAt: hoursAgo(21), notes: "All modules live: Problems, Changes, Releases, Tasks, IT Operations, Projects grid, Reporting, Notifications.", changes: [{ type: "feat", scope: "problems", subject: "known-error records linked to incidents" }, { type: "feat", scope: "changes", subject: "approvals, calendar, releases" }, { type: "feat", scope: "projects", subject: "Smartsheet-style grid with inline editing" }, { type: "feat", scope: "reporting", subject: "analytics + SLA performance" }] },
    { version: "0.3.1", bump: "patch", environment: "dev", commitSha: "e5b3a19", releasedAt: hoursAgo(20), notes: "Polish.", changes: [{ type: "fix", scope: "inbox", subject: "SLA chip colour on paused tickets" }, { type: "fix", scope: "portal", subject: "date picker time zone" }] },
  ]);

  // ---------- System jobs ----------
  await db.insert(schema.systemJobs).values([
    { name: "sla-clock", description: "Recompute SLA timers and flag at-risk tickets", schedule: "every 5 min", lastRunAt: hoursAgo(0.05), lastStatus: "ok", lastDurationMs: 412, nextRunAt: new Date(NOW.getTime() + 4 * 60_000), detail: "138 open tickets evaluated · 6 at risk · 2 breached" },
    { name: "mail-poll", description: "Poll support@ mailbox via Graph (safety net for subscriptions)", schedule: "every 5 min", lastRunAt: hoursAgo(0.07), lastStatus: "ok", lastDurationMs: 1180, nextRunAt: new Date(NOW.getTime() + 3 * 60_000), detail: "3 new messages threaded" },
    { name: "intune-sync", description: "Pull managed devices and hardware info from Intune", schedule: "hourly", lastRunAt: hoursAgo(0.6), lastStatus: "ok", lastDurationMs: 18_400, nextRunAt: new Date(NOW.getTime() + 24 * 60_000), detail: "146 devices · 2 new · 0 removed" },
    { name: "defender-sync", description: "Pull software inventory and vulnerabilities from Defender", schedule: "every 6 h", lastRunAt: hoursAgo(2.5), lastStatus: "ok", lastDurationMs: 41_200, nextRunAt: new Date(NOW.getTime() + 3.5 * 3_600_000), detail: "1,912 software rows · 14 unlicensed installs" },
    { name: "loganalytics-location", description: "Last-seen city per device from sign-in logs", schedule: "every 6 h", lastRunAt: hoursAgo(2.6), lastStatus: "warning", lastDurationMs: 9_800, nextRunAt: new Date(NOW.getTime() + 3.4 * 3_600_000), detail: "Workspace query throttled once; retried OK" },
    { name: "offboarding-watchdog", description: "Alert HR when access remains after last day", schedule: "daily 08:00", lastRunAt: daysAgo(0, 1.5), lastStatus: "ok", lastDurationMs: 220, nextRunAt: daysAgo(-1, -1.5), detail: "1 leaver past last day with active grants → HR alerted" },
    { name: "json-backup", description: "Nightly JSON export to offsite storage account", schedule: "daily 02:00", lastRunAt: daysAgo(0, 7.5), lastStatus: "ok", lastDurationMs: 64_000, nextRunAt: daysAgo(-1, 7.5), detail: "412 MB · 17 tables · verified checksum" },
  ]);

  // ---------- Activity log ----------
  const actors = [...agents, byName("Nada Haddad")];
  const actions: [string, string, string][] = [
    ["ticket.assign", "ticket", "ticket"],
    ["ticket.status.update", "ticket", "ticket"],
    ["ticket.reply", "ticket", "ticket"],
    ["ticket.priority.update", "ticket", "ticket"],
    ["asset.owner.update", "asset", "asset"],
    ["person.access.grant", "access", "person"],
    ["settings.sla.update", "settings", "sla_policy"],
    ["auth.login", "auth", "person"],
    ["integration.sync", "integration", "job"],
  ];
  const logRows: (typeof schema.activityLog.$inferInsert)[] = [];
  const ips = ["10.10.4.21", "10.10.4.87", "192.168.12.40", "172.16.9.15", "10.20.1.9"];
  for (let i = 0; i < 480; i++) {
    const [action, category, targetType] = pick(actions);
    const sys = action === "integration.sync";
    const actor = sys ? null : pick(actors);
    const tId = pick(inserted).id;
    const before = action === "ticket.status.update" ? { status: pick(["open", "in_progress"]) } : action === "ticket.priority.update" ? { priority: "medium" } : action === "ticket.assign" ? { assigneeId: null } : null;
    const after = action === "ticket.status.update" ? { status: pick(["in_progress", "pending", "resolved"]) } : action === "ticket.priority.update" ? { priority: pick(["high", "urgent"]) } : action === "ticket.assign" ? { assigneeId: pick(agents).id } : null;
    logRows.push({
      ts: hoursAgo(rand() * 24 * 14),
      actorId: actor?.id ?? null,
      actorName: actor?.displayName ?? "intune-sync",
      actorType: sys ? "system-job" : "user",
      action,
      category,
      targetType,
      targetId: targetType === "ticket" ? String(tId) : targetType === "job" ? "intune-sync" : String(pick(insertedPeople).id),
      before,
      after,
      ip: sys ? null : pick(ips),
      userAgent: sys ? null : pick(["Chrome 139 / macOS", "Edge 139 / Windows 11", "Safari 18 / macOS", "Chrome 139 / Windows 11"]),
      requestId: `req_${Math.floor(rand() * 1e9).toString(36)}`,
      release: pick(["0.3.0", "0.3.0", "0.3.1", "0.2.1"]),
    });
  }
  logRows.sort((a, b) => (a.ts as Date).getTime() - (b.ts as Date).getTime());
  await db.insert(schema.activityLog).values(logRows);

  // ---------- Saved views ----------
  await db.insert(schema.savedViews).values([
    { name: "My open tickets", filter: { assignee: "me", status: ["open", "in_progress", "pending"] }, shared: false },
    { name: "Unassigned", filter: { assignee: null, status: ["open"] }, shared: true },
    { name: "SLA at risk", filter: { sla: "at_risk" }, shared: true },
    { name: "VIP", filter: { tags: ["vip"] }, shared: true },
  ]);

  const [cnt] = (await db.execute(sql`select count(*)::int as count from tickets`)) as unknown as { count: number }[];
  console.log(`Seeded ${insertedPeople.length} people, ${cnt?.count} tickets, ${assetRows.length} assets, ${asRows.length} software installs, ${logRows.length} activity rows.`);
  process.exit(0);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
