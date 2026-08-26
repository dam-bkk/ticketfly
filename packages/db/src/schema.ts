import { sql, type SQL } from "drizzle-orm";
import {
  boolean,
  customType,
  date,
  index,
  integer,
  jsonb,
  numeric,
  pgEnum,
  pgTable,
  primaryKey,
  serial,
  text,
  timestamp,
  uniqueIndex,
} from "drizzle-orm/pg-core";

const tsvector = customType<{ data: string }>({ dataType: () => "tsvector" });

export const personRole = pgEnum("person_role", ["requester", "agent", "admin", "hr", "manager"]);
export const personStatus = pgEnum("person_status", ["active", "onboarding", "offboarding", "left"]);
export const ticketStatus = pgEnum("ticket_status", ["open", "pending", "in_progress", "on_hold", "resolved", "closed"]);
export const ticketPriority = pgEnum("ticket_priority", ["low", "medium", "high", "urgent"]);
export const ticketKind = pgEnum("ticket_kind", ["incident", "request", "onboarding", "offboarding", "access", "change"]);
export const ticketSource = pgEnum("ticket_source", ["portal", "email", "agent", "import", "system"]);
export const messageKind = pgEnum("message_kind", ["reply", "note", "system"]);
export const assetStatus = pgEnum("asset_status", ["in_use", "in_stock", "repair", "retired"]);
export const assetType = pgEnum("asset_type", ["laptop", "desktop", "mobile", "tablet", "monitor", "peripheral", "server"]);
export const compliance = pgEnum("compliance", ["compliant", "non_compliant", "unknown"]);
export const onboardingStage = pgEnum("onboarding_stage", ["requested", "provisioning", "ready", "active", "completed", "blocked"]);

export const people = pgTable(
  "people",
  {
    id: serial("id").primaryKey(),
    entraId: text("entra_id"),
    email: text("email").notNull(),
    displayName: text("display_name").notNull(),
    jobTitle: text("job_title"),
    department: text("department"),
    officeLocation: text("office_location"),
    managerId: integer("manager_id"),
    role: personRole("role").notNull().default("requester"),
    status: personStatus("status").notNull().default("active"),
    joinDate: date("join_date"),
    leaveDate: date("leave_date"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [uniqueIndex("people_email_idx").on(t.email)],
);

export const groups = pgTable("groups", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  description: text("description"),
});

export const groupMembers = pgTable(
  "group_members",
  { groupId: integer("group_id").notNull(), personId: integer("person_id").notNull() },
  (t) => [primaryKey({ columns: [t.groupId, t.personId] })],
);

export const categories = pgTable("categories", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  parentId: integer("parent_id"),
});

export const tickets = pgTable(
  "tickets",
  {
    id: serial("id").primaryKey(),
    legacyRef: text("legacy_ref"),
    kind: ticketKind("kind").notNull().default("incident"),
    subject: text("subject").notNull(),
    description: text("description").notNull().default(""),
    status: ticketStatus("status").notNull().default("open"),
    priority: ticketPriority("priority").notNull().default("medium"),
    requesterId: integer("requester_id").notNull(),
    assigneeId: integer("assignee_id"),
    groupId: integer("group_id"),
    categoryId: integer("category_id"),
    source: ticketSource("source").notNull().default("portal"),
    tags: text("tags").array().notNull().default(sql`'{}'::text[]`),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
    firstRespondedAt: timestamp("first_responded_at", { withTimezone: true }),
    resolvedAt: timestamp("resolved_at", { withTimezone: true }),
    closedAt: timestamp("closed_at", { withTimezone: true }),
    firstResponseDueAt: timestamp("first_response_due_at", { withTimezone: true }),
    resolutionDueAt: timestamp("resolution_due_at", { withTimezone: true }),
    slaPausedSince: timestamp("sla_paused_since", { withTimezone: true }),
    slaPausedMinutes: integer("sla_paused_minutes").notNull().default(0),
    satisfaction: integer("satisfaction"),
    problemId: integer("problem_id"),
    changeId: integer("change_id"),
    raw: jsonb("raw"),
    search: tsvector("search").generatedAlwaysAs(
      (): SQL => sql`setweight(to_tsvector('english', coalesce(${tickets.subject}, '')), 'A') || setweight(to_tsvector('english', coalesce(${tickets.description}, '')), 'B') || setweight(to_tsvector('simple', coalesce(${tickets.legacyRef}, '')), 'A')`,
    ),
  },
  (t) => [
    uniqueIndex("tickets_legacy_ref_idx").on(t.legacyRef),
    index("tickets_status_idx").on(t.status),
    index("tickets_assignee_idx").on(t.assigneeId),
    index("tickets_requester_idx").on(t.requesterId),
    index("tickets_search_idx").using("gin", t.search),
  ],
);

export const ticketMessages = pgTable(
  "ticket_messages",
  {
    id: serial("id").primaryKey(),
    ticketId: integer("ticket_id").notNull(),
    authorId: integer("author_id"),
    kind: messageKind("kind").notNull().default("reply"),
    body: text("body").notNull(),
    via: ticketSource("via").notNull().default("portal"),
    attachments: jsonb("attachments").$type<{ name: string; size: number; type: string }[]>().notNull().default([]),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("ticket_messages_ticket_idx").on(t.ticketId)],
);

export const activityLog = pgTable(
  "activity_log",
  {
    id: serial("id").primaryKey(),
    ts: timestamp("ts", { withTimezone: true, precision: 6 }).notNull().defaultNow(),
    actorId: integer("actor_id"),
    actorName: text("actor_name").notNull(),
    actorType: text("actor_type").notNull().default("user"),
    action: text("action").notNull(),
    category: text("category").notNull(),
    targetType: text("target_type"),
    targetId: text("target_id"),
    before: jsonb("before"),
    after: jsonb("after"),
    ip: text("ip"),
    userAgent: text("user_agent"),
    requestId: text("request_id"),
    release: text("release"),
  },
  (t) => [index("activity_log_ts_idx").on(t.ts), index("activity_log_category_idx").on(t.category)],
);

export const releases = pgTable("releases", {
  id: serial("id").primaryKey(),
  version: text("version").notNull(),
  bump: text("bump").notNull(),
  environment: text("environment").notNull().default("dev"),
  commitSha: text("commit_sha"),
  releasedAt: timestamp("released_at", { withTimezone: true }).notNull().defaultNow(),
  notes: text("notes"),
  changes: jsonb("changes").$type<{ type: string; scope?: string; subject: string }[]>().notNull().default([]),
});

export const assets = pgTable(
  "assets",
  {
    id: serial("id").primaryKey(),
    assetTag: text("asset_tag").notNull(),
    name: text("name").notNull(),
    type: assetType("type").notNull(),
    model: text("model"),
    serial: text("serial"),
    os: text("os"),
    osVersion: text("os_version"),
    ownerId: integer("owner_id"),
    status: assetStatus("status").notNull().default("in_use"),
    compliance: compliance("compliance").notNull().default("unknown"),
    source: text("source").notNull().default("intune"),
    lastSeenAt: timestamp("last_seen_at", { withTimezone: true }),
    lastSeenCity: text("last_seen_city"),
    lastSeenCountry: text("last_seen_country"),
    lastSeenIp: text("last_seen_ip"),
    encrypted: boolean("encrypted"),
    purchaseDate: date("purchase_date"),
    cost: numeric("cost", { precision: 10, scale: 2 }),
    // Freshservice-parity properties
    impact: text("impact").notNull().default("low"),
    usageType: text("usage_type").notNull().default("permanent"),
    department: text("department"),
    managedById: integer("managed_by_id"),
    managedByGroupId: integer("managed_by_group_id"),
    assignedOn: timestamp("assigned_on", { withTimezone: true }),
    endOfLife: date("end_of_life"),
    vendor: text("vendor"),
    warrantyExpiry: date("warranty_expiry"),
    domain: text("domain"),
    hostname: text("hostname"),
    memoryGb: numeric("memory_gb", { precision: 8, scale: 2 }),
    diskGb: numeric("disk_gb", { precision: 8, scale: 2 }),
    cpuGhz: numeric("cpu_ghz", { precision: 5, scale: 2 }),
    cpuCores: integer("cpu_cores"),
    macAddress: text("mac_address"),
    ipAddress: text("ip_address"),
    lastLoginBy: text("last_login_by"),
    discoveryEnabled: boolean("discovery_enabled").notNull().default(true),
    acknowledgedAt: timestamp("acknowledged_at", { withTimezone: true }),
    returnedAt: timestamp("returned_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [uniqueIndex("assets_tag_idx").on(t.assetTag)],
);

export const software = pgTable("software", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  vendor: text("vendor"),
  category: text("category"),
  licenceModel: text("licence_model").notNull().default("free"),
  unitMonthlyCost: numeric("unit_monthly_cost", { precision: 10, scale: 2 }).notNull().default("0"),
  seatsOwned: integer("seats_owned"),
});

export const assetSoftware = pgTable(
  "asset_software",
  {
    assetId: integer("asset_id").notNull(),
    softwareId: integer("software_id").notNull(),
    version: text("version").notNull(),
    status: text("status").notNull().default("in_review"),
    detectedAt: timestamp("detected_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [primaryKey({ columns: [t.assetId, t.softwareId] })],
);

export const services = pgTable("services", {
  id: serial("id").primaryKey(),
  slug: text("slug").notNull().unique(),
  name: text("name").notNull(),
  tagline: text("tagline").notNull(),
  description: text("description"),
  icon: text("icon").notNull().default("box"),
  kind: ticketKind("kind").notNull().default("request"),
  groupId: integer("group_id"),
  defaultPriority: ticketPriority("default_priority").notNull().default("medium"),
  fields: jsonb("fields").$type<ServiceField[]>().notNull().default([]),
  eta: text("eta"),
  popular: boolean("popular").notNull().default(false),
});

export interface ServiceField {
  key: string;
  label: string;
  type: "text" | "textarea" | "select" | "date" | "person" | "toggle";
  required?: boolean;
  options?: string[];
  help?: string;
}

export const onboardings = pgTable("onboardings", {
  id: serial("id").primaryKey(),
  personId: integer("person_id").notNull(),
  ticketId: integer("ticket_id"),
  kind: text("kind").notNull().default("onboarding"),
  joinDate: date("join_date").notNull(),
  cloneFromPersonId: integer("clone_from_person_id"),
  stage: onboardingStage("stage").notNull().default("requested"),
  tasks: jsonb("tasks").$type<OnboardingTask[]>().notNull().default([]),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export interface OnboardingTask {
  key: string;
  label: string;
  owner: string;
  status: "todo" | "in_progress" | "done" | "blocked";
  dueOffsetDays: number;
  doneAt?: string;
}

export const accessGrants = pgTable("access_grants", {
  id: serial("id").primaryKey(),
  personId: integer("person_id").notNull(),
  system: text("system").notNull(),
  displayName: text("display_name").notNull(),
  internalName: text("internal_name").notNull(),
  grantedAt: timestamp("granted_at", { withTimezone: true }).notNull().defaultNow(),
  revokedAt: timestamp("revoked_at", { withTimezone: true }),
  sourceTicketId: integer("source_ticket_id"),
  monthlyCost: numeric("monthly_cost", { precision: 10, scale: 2 }).notNull().default("0"),
});

export const slaPolicies = pgTable("sla_policies", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  priority: ticketPriority("priority").notNull(),
  firstResponseMinutes: integer("first_response_minutes").notNull(),
  resolutionMinutes: integer("resolution_minutes").notNull(),
  calendarHours: boolean("calendar_hours").notNull().default(false),
});

export const systemJobs = pgTable("system_jobs", {
  id: serial("id").primaryKey(),
  name: text("name").notNull().unique(),
  description: text("description"),
  schedule: text("schedule").notNull(),
  lastRunAt: timestamp("last_run_at", { withTimezone: true }),
  lastStatus: text("last_status").notNull().default("never"),
  lastDurationMs: integer("last_duration_ms"),
  nextRunAt: timestamp("next_run_at", { withTimezone: true }),
  detail: text("detail"),
});

export const savedViews = pgTable("saved_views", {
  id: serial("id").primaryKey(),
  ownerId: integer("owner_id"),
  name: text("name").notNull(),
  filter: jsonb("filter").notNull(),
  shared: boolean("shared").notNull().default(false),
});

// ---------- Freshservice-parity modules ----------
export const workspaces = pgTable("workspaces", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  slug: text("slug").notNull().unique(),
  primary: boolean("primary").notNull().default(false),
  icon: text("icon").notNull().default("monitor"),
});

export const kbFolders = pgTable("kb_folders", {
  id: serial("id").primaryKey(),
  category: text("category").notNull(),
  name: text("name").notNull(),
  visibility: text("visibility").notNull().default("all"),
});

export const kbArticles = pgTable(
  "kb_articles",
  {
    id: serial("id").primaryKey(),
    folderId: integer("folder_id").notNull(),
    title: text("title").notNull(),
    body: text("body").notNull().default(""),
    status: text("status").notNull().default("published"),
    authorId: integer("author_id"),
    views: integer("views").notNull().default(0),
    helpful: integer("helpful").notNull().default(0),
    notHelpful: integer("not_helpful").notNull().default(0),
    insertedInTickets: integer("inserted_in_tickets").notNull().default(0),
    reviewDue: date("review_due"),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("kb_articles_folder_idx").on(t.folderId)],
);

export const contracts = pgTable("contracts", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  vendor: text("vendor").notNull(),
  type: text("type").notNull().default("software"),
  status: text("status").notNull().default("active"),
  startDate: date("start_date").notNull(),
  endDate: date("end_date").notNull(),
  cost: numeric("cost", { precision: 12, scale: 2 }).notNull().default("0"),
  billing: text("billing").notNull().default("annual"),
  ownerId: integer("owner_id"),
  licences: integer("licences"),
  notes: text("notes"),
});

export const purchaseOrders = pgTable("purchase_orders", {
  id: serial("id").primaryKey(),
  number: text("number").notNull().unique(),
  vendor: text("vendor").notNull(),
  status: text("status").notNull().default("ordered"),
  total: numeric("total", { precision: 12, scale: 2 }).notNull().default("0"),
  currency: text("currency").notNull().default("USD"),
  orderedAt: date("ordered_at").notNull(),
  expectedAt: date("expected_at"),
  receivedAt: date("received_at"),
  requesterId: integer("requester_id"),
  items: jsonb("items").$type<{ name: string; qty: number; unit: number }[]>().notNull().default([]),
});

export const assetAssignments = pgTable(
  "asset_assignments",
  {
    id: serial("id").primaryKey(),
    assetId: integer("asset_id").notNull(),
    personId: integer("person_id"),
    assignedAt: timestamp("assigned_at", { withTimezone: true }).notNull().defaultNow(),
    acknowledgedAt: timestamp("acknowledged_at", { withTimezone: true }),
    returnedAt: timestamp("returned_at", { withTimezone: true }),
    note: text("note"),
  },
  (t) => [index("asset_assignments_asset_idx").on(t.assetId)],
);

// ---------- ITIL modules (Problems, Changes, Releases, Tasks) ----------
export const problemStatus = pgEnum("problem_status", ["open", "known_error", "resolved", "closed"]);
export const changeType = pgEnum("change_type", ["standard", "normal", "emergency"]);
export const changeStatus = pgEnum("change_status", ["open", "planning", "awaiting_approval", "approved", "in_progress", "completed", "rolled_back", "closed"]);
export const riskLevel = pgEnum("risk_level", ["low", "medium", "high"]);
export const taskStatus = pgEnum("task_status", ["open", "in_progress", "done"]);

export const problems = pgTable("problems", {
  id: serial("id").primaryKey(),
  title: text("title").notNull(),
  description: text("description").notNull().default(""),
  status: problemStatus("status").notNull().default("open"),
  priority: ticketPriority("priority").notNull().default("medium"),
  impact: riskLevel("impact").notNull().default("medium"),
  assigneeId: integer("assignee_id"),
  groupId: integer("group_id"),
  categoryId: integer("category_id"),
  rootCause: text("root_cause"),
  workaround: text("workaround"),
  permanentFix: text("permanent_fix"),
  changeId: integer("change_id"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  resolvedAt: timestamp("resolved_at", { withTimezone: true }),
});

export const problemIncidents = pgTable(
  "problem_incidents",
  { problemId: integer("problem_id").notNull(), ticketId: integer("ticket_id").notNull() },
  (t) => [primaryKey({ columns: [t.problemId, t.ticketId] })],
);

export const changes = pgTable("changes", {
  id: serial("id").primaryKey(),
  title: text("title").notNull(),
  description: text("description").notNull().default(""),
  reason: text("reason"),
  type: changeType("type").notNull().default("normal"),
  status: changeStatus("status").notNull().default("open"),
  risk: riskLevel("risk").notNull().default("medium"),
  impact: riskLevel("impact").notNull().default("medium"),
  priority: ticketPriority("priority").notNull().default("medium"),
  requesterId: integer("requester_id").notNull(),
  assigneeId: integer("assignee_id"),
  groupId: integer("group_id"),
  plannedStart: timestamp("planned_start", { withTimezone: true }),
  plannedEnd: timestamp("planned_end", { withTimezone: true }),
  rollbackPlan: text("rollback_plan"),
  testPlan: text("test_plan"),
  approvals: jsonb("approvals").$type<{ personId: number; name: string; decision: "pending" | "approved" | "rejected"; at?: string; note?: string }[]>().notNull().default([]),
  affectedAssetIds: jsonb("affected_asset_ids").$type<number[]>().notNull().default([]),
  releaseId: integer("release_id"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  completedAt: timestamp("completed_at", { withTimezone: true }),
});

export const itReleases = pgTable("it_releases", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  description: text("description").notNull().default(""),
  status: text("status").notNull().default("planning"),
  version: text("version"),
  ownerId: integer("owner_id"),
  plannedStart: timestamp("planned_start", { withTimezone: true }),
  plannedEnd: timestamp("planned_end", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const tasks = pgTable(
  "tasks",
  {
    id: serial("id").primaryKey(),
    title: text("title").notNull(),
    status: taskStatus("status").notNull().default("open"),
    assigneeId: integer("assignee_id"),
    groupId: integer("group_id"),
    dueAt: timestamp("due_at", { withTimezone: true }),
    parentType: text("parent_type").notNull(),
    parentId: integer("parent_id").notNull(),
    notes: text("notes"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    completedAt: timestamp("completed_at", { withTimezone: true }),
  },
  (t) => [index("tasks_parent_idx").on(t.parentType, t.parentId), index("tasks_assignee_idx").on(t.assigneeId)],
);

// ---------- IT Operations ----------
export const alerts = pgTable("alerts", {
  id: serial("id").primaryKey(),
  source: text("source").notNull(),
  severity: text("severity").notNull().default("medium"),
  title: text("title").notNull(),
  resource: text("resource"),
  detail: text("detail"),
  status: text("status").notNull().default("new"),
  ticketId: integer("ticket_id"),
  firedAt: timestamp("fired_at", { withTimezone: true }).notNull().defaultNow(),
  acknowledgedAt: timestamp("acknowledged_at", { withTimezone: true }),
  resolvedAt: timestamp("resolved_at", { withTimezone: true }),
});

export const itServices = pgTable("it_services", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  description: text("description"),
  health: text("health").notNull().default("operational"),
  ownerId: integer("owner_id"),
  maintenanceFrom: timestamp("maintenance_from", { withTimezone: true }),
  maintenanceTo: timestamp("maintenance_to", { withTimezone: true }),
  maintenanceNote: text("maintenance_note"),
});

// ---------- Projects (grid-first) ----------
export const projects = pgTable("projects", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  description: text("description"),
  status: text("status").notNull().default("active"),
  ownerId: integer("owner_id"),
  startDate: date("start_date"),
  endDate: date("end_date"),
  workspace: text("workspace").notNull().default("it"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const projectRows = pgTable(
  "project_rows",
  {
    id: serial("id").primaryKey(),
    projectId: integer("project_id").notNull(),
    position: integer("position").notNull().default(0),
    parentId: integer("parent_id"),
    title: text("title").notNull().default(""),
    status: text("status").notNull().default("not_started"),
    ownerId: integer("owner_id"),
    startDate: date("start_date"),
    endDate: date("end_date"),
    percent: integer("percent").notNull().default(0),
    priority: text("priority").notNull().default("medium"),
    notes: text("notes"),
    ticketId: integer("ticket_id"),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("project_rows_project_idx").on(t.projectId, t.position)],
);

// ---------- Notifications & preferences ----------
export const notifications = pgTable(
  "notifications",
  {
    id: serial("id").primaryKey(),
    personId: integer("person_id").notNull(),
    kind: text("kind").notNull(),
    title: text("title").notNull(),
    body: text("body"),
    href: text("href"),
    readAt: timestamp("read_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("notifications_person_idx").on(t.personId, t.readAt)],
);

export const userPrefs = pgTable("user_prefs", {
  personId: integer("person_id").primaryKey(),
  hiddenModules: jsonb("hidden_modules").$type<string[]>().notNull().default([]),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});
