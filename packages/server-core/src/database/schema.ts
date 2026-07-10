import {
  check,
  index,
  integer,
  jsonb,
  pgEnum,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
  varchar
} from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";

const timestamps = {
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull()
};

export const userStatus = pgEnum("user_status", ["active", "disabled", "deleting"]);
export const verificationPurpose = pgEnum("verification_purpose", [
  "register",
  "login",
  "reset-password"
]);
export const aiJobStatus = pgEnum("ai_job_status", [
  "queued",
  "running",
  "succeeded",
  "failed",
  "cancelled"
]);
export const creditEntryType = pgEnum("credit_entry_type", [
  "grant",
  "reserve",
  "charge",
  "release",
  "refund"
]);
export const outboxStatus = pgEnum("outbox_status", ["pending", "published", "failed"]);
export const moderationStatus = pgEnum("moderation_status", [
  "pending",
  "running",
  "passed",
  "blocked",
  "failed"
]);
export const notificationStatus = pgEnum("notification_status", [
  "pending",
  "running",
  "delivered",
  "failed"
]);
export const notificationChannel = pgEnum("notification_channel", ["email", "sms", "in_app"]);

export const users = pgTable(
  "users",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    email: varchar("email", { length: 320 }).notNull(),
    passwordHash: text("password_hash").notNull(),
    displayName: varchar("display_name", { length: 80 }).notNull(),
    status: userStatus("status").default("active").notNull(),
    ...timestamps
  },
  (table) => [uniqueIndex("users_email_unique").on(table.email)]
);

export const workspaces = pgTable(
  "workspaces",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    ownerUserId: uuid("owner_user_id")
      .notNull()
      .references(() => users.id),
    name: varchar("name", { length: 120 }).notNull(),
    ...timestamps
  },
  (table) => [index("workspaces_owner_idx").on(table.ownerUserId)]
);

export const workspaceMemberships = pgTable(
  "workspace_memberships",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    workspaceId: uuid("workspace_id")
      .notNull()
      .references(() => workspaces.id, { onDelete: "cascade" }),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    role: varchar("role", { length: 32 }).default("owner").notNull(),
    ...timestamps
  },
  (table) => [
    uniqueIndex("workspace_membership_unique").on(table.workspaceId, table.userId),
    index("workspace_memberships_user_idx").on(table.userId)
  ]
);

export const sessions = pgTable(
  "sessions",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    workspaceId: uuid("workspace_id")
      .notNull()
      .references(() => workspaces.id, { onDelete: "cascade" }),
    tokenHash: varchar("token_hash", { length: 64 }).notNull(),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
    lastSeenAt: timestamp("last_seen_at", { withTimezone: true }).defaultNow().notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull()
  },
  (table) => [
    uniqueIndex("sessions_token_hash_unique").on(table.tokenHash),
    index("sessions_user_idx").on(table.userId),
    index("sessions_expires_idx").on(table.expiresAt)
  ]
);

export const verificationCodes = pgTable(
  "verification_codes",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    target: varchar("target", { length: 320 }).notNull(),
    purpose: verificationPurpose("purpose").notNull(),
    codeHash: varchar("code_hash", { length: 64 }).notNull(),
    attempts: integer("attempts").default(0).notNull(),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
    consumedAt: timestamp("consumed_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull()
  },
  (table) => [index("verification_codes_lookup_idx").on(table.target, table.purpose)]
);

export const creditAccounts = pgTable(
  "credit_accounts",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    workspaceId: uuid("workspace_id")
      .notNull()
      .references(() => workspaces.id, { onDelete: "cascade" }),
    balance: integer("balance").default(0).notNull(),
    reserved: integer("reserved").default(0).notNull(),
    version: integer("version").default(1).notNull(),
    ...timestamps
  },
  (table) => [
    uniqueIndex("credit_accounts_workspace_unique").on(table.workspaceId),
    check("credit_accounts_balance_nonnegative", sql`${table.balance} >= 0`),
    check(
      "credit_accounts_reserved_valid",
      sql`${table.reserved} >= 0 AND ${table.reserved} <= ${table.balance}`
    )
  ]
);

export const creditLedger = pgTable(
  "credit_ledger",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    workspaceId: uuid("workspace_id")
      .notNull()
      .references(() => workspaces.id, { onDelete: "restrict" }),
    entryType: creditEntryType("entry_type").notNull(),
    amount: integer("amount").default(0).notNull(),
    reservedDelta: integer("reserved_delta").default(0).notNull(),
    balanceAfter: integer("balance_after").notNull(),
    reservedAfter: integer("reserved_after").notNull(),
    idempotencyKey: varchar("idempotency_key", { length: 160 }).notNull(),
    referenceType: varchar("reference_type", { length: 40 }),
    referenceId: uuid("reference_id"),
    metadata: jsonb("metadata").$type<Record<string, unknown>>().default({}).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull()
  },
  (table) => [
    uniqueIndex("credit_ledger_idempotency_unique").on(
      table.workspaceId,
      table.idempotencyKey
    ),
    index("credit_ledger_workspace_idx").on(table.workspaceId, table.createdAt)
  ]
);

export const uploads = pgTable(
  "uploads",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    workspaceId: uuid("workspace_id")
      .notNull()
      .references(() => workspaces.id, { onDelete: "cascade" }),
    storageProvider: varchar("storage_provider", { length: 20 }).notNull(),
    storageKey: text("storage_key").notNull(),
    originalName: varchar("original_name", { length: 255 }).notNull(),
    contentType: varchar("content_type", { length: 120 }).notNull(),
    byteSize: integer("byte_size").notNull(),
    checksumSha256: varchar("checksum_sha256", { length: 64 }).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull()
  },
  (table) => [
    uniqueIndex("uploads_storage_key_unique").on(table.storageProvider, table.storageKey),
    index("uploads_workspace_idx").on(table.workspaceId, table.createdAt)
  ]
);

export const projects = pgTable(
  "projects",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    workspaceId: uuid("workspace_id")
      .notNull()
      .references(() => workspaces.id, { onDelete: "cascade" }),
    title: varchar("title", { length: 160 }).notNull(),
    prompt: text("prompt").default("").notNull(),
    thumbnailStorageKey: text("thumbnail_storage_key"),
    canvasDocument: jsonb("canvas_document").$type<Record<string, unknown>>().notNull(),
    version: integer("version").default(1).notNull(),
    ...timestamps
  },
  (table) => [index("projects_workspace_recent_idx").on(table.workspaceId, table.updatedAt)]
);

export const aiJobs = pgTable(
  "ai_jobs",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    workspaceId: uuid("workspace_id")
      .notNull()
      .references(() => workspaces.id, { onDelete: "cascade" }),
    projectId: uuid("project_id")
      .notNull()
      .references(() => projects.id, { onDelete: "cascade" }),
    createdByUserId: uuid("created_by_user_id")
      .notNull()
      .references(() => users.id, { onDelete: "restrict" }),
    modelId: varchar("model_id", { length: 100 }).notNull(),
    status: aiJobStatus("status").default("queued").notNull(),
    input: jsonb("input").$type<Record<string, unknown>>().notNull(),
    output: jsonb("output").$type<Record<string, unknown>>(),
    errorCode: varchar("error_code", { length: 100 }),
    errorMessage: text("error_message"),
    reservedCredits: integer("reserved_credits").notNull(),
    chargedCredits: integer("charged_credits").default(0).notNull(),
    idempotencyKey: varchar("idempotency_key", { length: 160 }).notNull(),
    attemptCount: integer("attempt_count").default(0).notNull(),
    startedAt: timestamp("started_at", { withTimezone: true }),
    finishedAt: timestamp("finished_at", { withTimezone: true }),
    ...timestamps
  },
  (table) => [
    uniqueIndex("ai_jobs_idempotency_unique").on(table.workspaceId, table.idempotencyKey),
    index("ai_jobs_project_idx").on(table.workspaceId, table.projectId, table.createdAt),
    index("ai_jobs_status_idx").on(table.status, table.createdAt),
    check("ai_jobs_reserved_credits_nonnegative", sql`${table.reservedCredits} >= 0`),
    check("ai_jobs_charged_credits_nonnegative", sql`${table.chargedCredits} >= 0`)
  ]
);

export const outboxEvents = pgTable(
  "outbox_events",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    aggregateType: varchar("aggregate_type", { length: 60 }).notNull(),
    aggregateId: uuid("aggregate_id").notNull(),
    eventType: varchar("event_type", { length: 100 }).notNull(),
    payload: jsonb("payload").$type<Record<string, unknown>>().notNull(),
    status: outboxStatus("status").default("pending").notNull(),
    attempts: integer("attempts").default(0).notNull(),
    availableAt: timestamp("available_at", { withTimezone: true }).defaultNow().notNull(),
    publishedAt: timestamp("published_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull()
  },
  (table) => [index("outbox_pending_idx").on(table.status, table.availableAt)]
);

export const moderationJobs = pgTable(
  "moderation_jobs",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    workspaceId: uuid("workspace_id")
      .notNull()
      .references(() => workspaces.id, { onDelete: "cascade" }),
    subjectType: varchar("subject_type", { length: 40 }).notNull(),
    subjectId: varchar("subject_id", { length: 160 }).notNull(),
    contentHash: varchar("content_hash", { length: 64 }).notNull(),
    provider: varchar("provider", { length: 40 }).notNull(),
    status: moderationStatus("status").default("pending").notNull(),
    attemptCount: integer("attempt_count").default(0).notNull(),
    availableAt: timestamp("available_at", { withTimezone: true }).defaultNow().notNull(),
    startedAt: timestamp("started_at", { withTimezone: true }),
    finishedAt: timestamp("finished_at", { withTimezone: true }),
    result: jsonb("result").$type<Record<string, unknown>>().default({}).notNull(),
    errorCode: varchar("error_code", { length: 100 }),
    errorMessage: text("error_message"),
    idempotencyKey: varchar("idempotency_key", { length: 160 }).notNull(),
    ...timestamps
  },
  (table) => [
    uniqueIndex("moderation_jobs_idempotency_unique").on(table.workspaceId, table.idempotencyKey),
    index("moderation_jobs_available_idx").on(table.status, table.availableAt),
    index("moderation_jobs_workspace_idx").on(table.workspaceId, table.createdAt)
  ]
);

export const notificationDeliveries = pgTable(
  "notification_deliveries",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    workspaceId: uuid("workspace_id")
      .notNull()
      .references(() => workspaces.id, { onDelete: "cascade" }),
    recipientUserId: uuid("recipient_user_id").references(() => users.id, {
      onDelete: "set null"
    }),
    channel: notificationChannel("channel").notNull(),
    recipient: varchar("recipient", { length: 320 }).notNull(),
    templateKey: varchar("template_key", { length: 100 }).notNull(),
    payload: jsonb("payload").$type<Record<string, unknown>>().default({}).notNull(),
    provider: varchar("provider", { length: 40 }).notNull(),
    providerReference: varchar("provider_reference", { length: 160 }),
    status: notificationStatus("status").default("pending").notNull(),
    attemptCount: integer("attempt_count").default(0).notNull(),
    availableAt: timestamp("available_at", { withTimezone: true }).defaultNow().notNull(),
    startedAt: timestamp("started_at", { withTimezone: true }),
    deliveredAt: timestamp("delivered_at", { withTimezone: true }),
    errorCode: varchar("error_code", { length: 100 }),
    errorMessage: text("error_message"),
    idempotencyKey: varchar("idempotency_key", { length: 160 }).notNull(),
    ...timestamps
  },
  (table) => [
    uniqueIndex("notification_deliveries_idempotency_unique").on(
      table.workspaceId,
      table.idempotencyKey
    ),
    index("notification_deliveries_available_idx").on(table.status, table.availableAt),
    index("notification_deliveries_workspace_idx").on(table.workspaceId, table.createdAt)
  ]
);

export const auditEvents = pgTable(
  "audit_events",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    workspaceId: uuid("workspace_id")
      .notNull()
      .references(() => workspaces.id, { onDelete: "restrict" }),
    actorUserId: uuid("actor_user_id").references(() => users.id, { onDelete: "set null" }),
    action: varchar("action", { length: 120 }).notNull(),
    targetType: varchar("target_type", { length: 60 }).notNull(),
    targetId: varchar("target_id", { length: 160 }).notNull(),
    requestId: varchar("request_id", { length: 80 }),
    metadata: jsonb("metadata").$type<Record<string, unknown>>().default({}).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull()
  },
  (table) => [index("audit_events_workspace_idx").on(table.workspaceId, table.createdAt)]
);
