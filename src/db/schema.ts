import { pgTable, uuid, text, timestamp, boolean, integer, bigint, index } from "drizzle-orm/pg-core";

export const users = pgTable("users", {
  id: uuid("id").defaultRandom().primaryKey(),
  email: text("email").notNull().unique(),
  phone: text("phone").notNull().unique(),
  passwordHash: text("password_hash"),
  emailVerified: boolean("email_verified").notNull().default(false),
  phoneVerified: boolean("phone_verified").notNull().default(false),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull()
});

export const tenants = pgTable("tenants", {
  id: uuid("id").defaultRandom().primaryKey(),
  name: text("name").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull()
});

export const memberships = pgTable(
  "memberships",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    userId: uuid("user_id").notNull(),
    tenantId: uuid("tenant_id").notNull(),
    role: text("role").notNull(),
    isDefault: boolean("is_default").notNull().default(false),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull()
  },
  (t) => ({
    byUser: index("idx_memberships_user").on(t.userId),
    byTenant: index("idx_memberships_tenant").on(t.tenantId)
  })
);

export const brands = pgTable(
  "brands",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    tenantId: uuid("tenant_id").notNull(),
    name: text("name").notNull(),
    slug: text("slug").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull()
  },
  (t) => ({
    byTenant: index("idx_brands_tenant").on(t.tenantId),
    bySlug: index("idx_brands_slug").on(t.slug)
  })
);

export const tenantDomains = pgTable(
  "tenant_domains",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    tenantId: uuid("tenant_id").notNull(),
    subdomain: text("subdomain").notNull(),
    customDomain: text("custom_domain"),
    isPrimary: boolean("is_primary").notNull().default(false),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull()
  },
  (t) => ({
    byTenant: index("idx_tenant_domains_tenant").on(t.tenantId),
    bySub: index("idx_tenant_domains_sub").on(t.subdomain)
  })
);

export const serviceCategories = pgTable(
  "service_categories",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    tenantId: uuid("tenant_id").notNull(),
    name: text("name").notNull(),
    color: text("color"),
    sortOrder: integer("sort_order").default(0),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull()
  },
  (t) => ({
    byTenant: index("idx_service_categories_tenant").on(t.tenantId)
  })
);

export const services = pgTable(
  "services",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    tenantId: uuid("tenant_id").notNull(),
    categoryId: uuid("category_id").notNull(),
    name: text("name").notNull(),
    description: text("description"),
    durationMin: integer("duration_min").notNull(),
    priceCents: integer("price_cents").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull()
  },
  (t) => ({
    byTenant: index("idx_services_tenant").on(t.tenantId),
    byCategory: index("idx_services_category").on(t.categoryId)
  })
);

export const servicePolicies = pgTable(
  "service_policies",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    tenantId: uuid("tenant_id").notNull(),
    serviceId: uuid("service_id").notNull(),
    depositRequired: boolean("deposit_required").notNull().default(false),
    depositAmountCents: integer("deposit_amount_cents").notNull().default(0),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull()
  },
  (t) => ({
    byTenant: index("idx_service_policies_tenant").on(t.tenantId),
    byService: index("idx_service_policies_service").on(t.serviceId)
  })
);

export const clients = pgTable(
  "clients",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    tenantId: uuid("tenant_id").notNull(),
    email: text("email"),
    phone: text("phone"),
    name: text("name"),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull()
  },
  (t) => ({
    byTenant: index("idx_clients_tenant").on(t.tenantId),
    byPhone: index("idx_clients_phone").on(t.phone)
  })
);

export const staff = pgTable(
  "staff",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    tenantId: uuid("tenant_id").notNull(),
    userId: uuid("user_id"),
    name: text("name"),
    commissionEnabled: boolean("commission_enabled").notNull().default(false),
    commissionRate: integer("commission_rate").default(0),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull()
  },
  (t) => ({
    byTenant: index("idx_staff_tenant").on(t.tenantId)
  })
);

export const appointments = pgTable(
  "appointments",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    tenantId: uuid("tenant_id").notNull(),
    clientId: uuid("client_id").notNull(),
    serviceId: uuid("service_id").notNull(),
    providerId: uuid("provider_id"),
    startAt: timestamp("start_at", { withTimezone: true }).notNull(),
    endAt: timestamp("end_at", { withTimezone: true }).notNull(),
    status: text("status").notNull().default("scheduled"),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull()
  },
  (t) => ({
    byTenant: index("idx_appointments_tenant").on(t.tenantId),
    byTenantStart: index("idx_appointments_tenant_start").on(t.tenantId, t.startAt),
    byProvider: index("idx_appointments_provider").on(t.providerId)
  })
);

export const timers = pgTable(
  "timers",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    tenantId: uuid("tenant_id").notNull(),
    appointmentId: uuid("appointment_id").notNull(),
    startedAt: timestamp("started_at", { withTimezone: true }).notNull(),
    stoppedAt: timestamp("stopped_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull()
  },
  (t) => ({
    byAppt: index("idx_timers_appointment").on(t.appointmentId)
  })
);

export const orders = pgTable(
  "orders",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    tenantId: uuid("tenant_id").notNull(),
    clientId: uuid("client_id"),
    appointmentId: uuid("appointment_id"),
    totalCents: bigint("total_cents", { mode: "number" }).notNull().default(0),
    status: text("status").notNull().default("open"),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull()
  },
  (t) => ({
    byTenant: index("idx_orders_tenant").on(t.tenantId),
    byClient: index("idx_orders_client").on(t.clientId)
  })
);

export const orderItems = pgTable(
  "order_items",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    tenantId: uuid("tenant_id").notNull(),
    orderId: uuid("order_id").notNull(),
    serviceId: uuid("service_id"),
    name: text("name").notNull(),
    qty: integer("qty").notNull().default(1),
    priceCents: integer("price_cents").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull()
  },
  (t) => ({
    byOrder: index("idx_order_items_order").on(t.orderId)
  })
);

export const payments = pgTable(
  "payments",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    tenantId: uuid("tenant_id").notNull(),
    orderId: uuid("order_id").notNull(),
    provider: text("provider").notNull().default("stripe"),
    providerPaymentId: text("provider_payment_id"),
    amountCents: bigint("amount_cents", { mode: "number" }).notNull(),
    status: text("status").notNull().default("requires_payment_method"),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull()
  },
  (t) => ({
    byOrder: index("idx_payments_order").on(t.orderId)
  })
);

export const uploads = pgTable(
  "uploads",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    tenantId: uuid("tenant_id").notNull(),
    key: text("key").notNull(),
    url: text("url"),
    contentType: text("content_type"),
    sizeBytes: bigint("size_bytes", { mode: "number" }),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull()
  },
  (t) => ({
    byTenant: index("idx_uploads_tenant").on(t.tenantId)
  })
);

export const forms = pgTable(
  "forms",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    tenantId: uuid("tenant_id").notNull(),
    name: text("name").notNull(),
    schemaJson: text("schema_json").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull()
  },
  (t) => ({
    byTenant: index("idx_forms_tenant").on(t.tenantId)
  })
);

export const formSubmissions = pgTable(
  "form_submissions",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    tenantId: uuid("tenant_id").notNull(),
    formId: uuid("form_id").notNull(),
    clientId: uuid("client_id"),
    dataJson: text("data_json").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull()
  },
  (t) => ({
    byForm: index("idx_form_submissions_form").on(t.formId)
  })
);

export const webhooks = pgTable(
  "webhooks",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    tenantId: uuid("tenant_id").notNull(),
    url: text("url").notNull(),
    secret: text("secret").notNull(),
    active: boolean("active").notNull().default(true),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull()
  },
  (t) => ({
    byTenant: index("idx_webhooks_tenant").on(t.tenantId)
  })
);

export const webhookDeliveries = pgTable(
  "webhook_deliveries",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    tenantId: uuid("tenant_id").notNull(),
    event: text("event").notNull(),
    payloadJson: text("payload_json").notNull(),
    deliveredAt: timestamp("delivered_at", { withTimezone: true }),
    status: text("status").notNull().default("pending"),
    attempt: integer("attempt").notNull().default(0),
    signature: text("signature"),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull()
  },
  (t) => ({
    byTenant: index("idx_webhook_deliveries_tenant").on(t.tenantId)
  })
);

export const auditLogs = pgTable("audit_logs", {
  id: uuid("id").defaultRandom().primaryKey(),
  tenantId: uuid("tenant_id"),
  actorType: text("actor_type").notNull(),
  actorId: uuid("actor_id"),
  action: text("action").notNull(),
  entityType: text("entity_type"),
  entityId: uuid("entity_id"),
  beforeJson: text("before_json"),
  afterJson: text("after_json"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull()
});

export const clientCredits = pgTable(
  "client_credits",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    tenantId: uuid("tenant_id").notNull(),
    clientId: uuid("client_id").notNull(),
    balanceCents: bigint("balance_cents", { mode: "number" }).notNull().default(0),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull()
  },
  (t) => ({
    byTenantClient: index("idx_client_credits_tenant_client").on(t.tenantId, t.clientId)
  })
);

export const clientCreditLedger = pgTable(
  "client_credit_ledger",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    tenantId: uuid("tenant_id").notNull(),
    clientId: uuid("client_id").notNull(),
    type: text("type").notNull(),
    amountCents: bigint("amount_cents", { mode: "number" }).notNull(),
    refType: text("ref_type"),
    refId: uuid("ref_id"),
    note: text("note"),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull()
  },
  (t) => ({
    byTenantClient: index("idx_client_credit_ledger_tenant_client").on(t.tenantId, t.clientId)
  })
);

export const waitlist = pgTable(
  "waitlist",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    tenantId: uuid("tenant_id").notNull(),
    clientId: uuid("client_id").notNull(),
    serviceId: uuid("service_id").notNull(),
    preferredWindowsJson: text("preferred_windows_json").notNull(),
    priority: integer("priority").notNull().default(0),
    status: text("status").notNull().default("open"),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull()
  },
  (t) => ({
    byTenant: index("idx_waitlist_tenant").on(t.tenantId)
  })
);

export const clientWallets = pgTable(
  "client_wallets",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    tenantId: uuid("tenant_id").notNull(),
    clientId: uuid("client_id").notNull(),
    externalAddress: text("external_address"),
    custodial: boolean("custodial").default(false),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull()
  },
  (t) => ({
    byTenantClient: index("idx_client_wallets_tenant_client").on(t.tenantId, t.clientId)
  })
);

export const clientTokenBalances = pgTable(
  "client_token_balances",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    tenantId: uuid("tenant_id").notNull(),
    clientId: uuid("client_id").notNull(),
    balance: bigint("balance", { mode: "number" }).notNull().default(0),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull()
  },
  (t) => ({
    byTenantClient: index("idx_client_token_balances_tenant_client").on(t.tenantId, t.clientId)
  })
);

export const clientTokenLedger = pgTable(
  "client_token_ledger",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    tenantId: uuid("tenant_id").notNull(),
    clientId: uuid("client_id").notNull(),
    type: text("type").notNull(),
    amount: bigint("amount", { mode: "number" }).notNull(),
    refType: text("ref_type"),
    refId: uuid("ref_id"),
    note: text("note"),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull()
  },
  (t) => ({
    byTenantClient: index("idx_client_token_ledger_tenant_client").on(t.tenantId, t.clientId)
  })
);

export const earnRules = pgTable(
  "earn_rules",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    tenantId: uuid("tenant_id").notNull(),
    key: text("key").notNull(),
    amount: bigint("amount", { mode: "number" }).notNull(),
    capDaily: integer("cap_daily"),
    active: boolean("active").notNull().default(true)
  },
  (t) => ({
    byTenant: index("idx_earn_rules_tenant").on(t.tenantId),
    byKey: index("idx_earn_rules_key").on(t.key)
  })
);

export const redeemRules = pgTable(
  "redeem_rules",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    tenantId: uuid("tenant_id").notNull(),
    key: text("key").notNull(),
    amount: bigint("amount", { mode: "number" }).notNull(),
    minBalance: bigint("min_balance", { mode: "number" }),
    active: boolean("active").notNull().default(true)
  },
  (t) => ({
    byTenant: index("idx_redeem_rules_tenant").on(t.tenantId),
    byKey: index("idx_redeem_rules_key").on(t.key)
  })
);
