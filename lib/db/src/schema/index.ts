import {
  pgTable,
  serial,
  varchar,
  text,
  integer,
  boolean,
  timestamp,
  pgEnum,
  date,
  index,
} from "drizzle-orm/pg-core";
import { createInsertSchema, createSelectSchema } from "drizzle-zod";
import { z } from "zod/v4";

// ─── Enums ────────────────────────────────────────────────────────────────────
export const providerStatusEnum = pgEnum("provider_status", [
  "active",
  "trial",
  "suspended",
  "pending",
]);

export const subscriptionTierEnum = pgEnum("subscription_tier", [
  "basic",
  "pro",
  "enterprise",
]);

export const subscriptionStatusEnum = pgEnum("subscription_status", [
  "active",
  "trial",
  "cancelled",
  "expired",
]);

export const churnRiskEnum = pgEnum("churn_risk", ["low", "medium", "high"]);

export const bookingStatusEnum = pgEnum("booking_status", [
  "confirmed",
  "cancelled",
  "attended",
  "absent",
  "new",
]);

export const bookingSourceEnum = pgEnum("booking_source", ["manual", "online"]);

export const packageTierEnum = pgEnum("package_tier", [
  "basic",
  "pro",
  "enterprise",
]);

// ─── providers (salon accounts) ───────────────────────────────────────────────
export const providers = pgTable(
  "providers",
  {
    id: serial("id").primaryKey(),
    username: varchar("username", { length: 100 }).notNull().unique(),
    email: varchar("email", { length: 255 }).notNull().unique(),
    nameAr: varchar("name_ar", { length: 255 }).notNull(),
    nameEn: varchar("name_en", { length: 255 }).notNull(),
    slug: varchar("slug", { length: 100 }).unique(),
    status: providerStatusEnum("status").notNull().default("trial"),
    subscriptionTier: subscriptionTierEnum("subscription_tier")
      .notNull()
      .default("basic"),
    subscriptionStatus: subscriptionStatusEnum("subscription_status")
      .notNull()
      .default("trial"),
    churnRisk: churnRiskEnum("churn_risk").notNull().default("low"),
    mrr: integer("mrr").notNull().default(0),
    onlineBookingEnabled: boolean("online_booking_enabled")
      .notNull()
      .default(false),
    city: varchar("city", { length: 100 }),
    phone: varchar("phone", { length: 20 }),
    stripeCustomerId: varchar("stripe_customer_id", { length: 255 }),
    stripeSubscriptionId: varchar("stripe_subscription_id", { length: 255 }),
    billingCycle: varchar("billing_cycle", { length: 10 }),
    role: varchar("role", { length: 20 }).notNull().default("provider"),
    // Salon logo (stored as base64 data URL)
    logoUrl: text("logo_url"),
    // Password-based auth
    passwordHash: varchar("password_hash", { length: 255 }),
    // Subscription lifecycle
    subscriptionEndsAt: timestamp("subscription_ends_at"),
    remindersSent: varchar("reminders_sent", { length: 30 }).notNull().default(""),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at").notNull().defaultNow(),
  },
  (t) => [],  // email uniqueness is enforced by the column-level .unique() constraint
);

export const insertProviderSchema = createInsertSchema(providers).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});
export type InsertProvider = z.infer<typeof insertProviderSchema>;
export type Provider = typeof providers.$inferSelect;

// ─── clients (per provider) ────────────────────────────────────────────────────
export const clients = pgTable(
  "clients",
  {
    id: serial("id").primaryKey(),
    providerId: integer("provider_id")
      .notNull()
      .references(() => providers.id, { onDelete: "cascade" }),
    name: varchar("name", { length: 255 }).notNull(),
    phone: varchar("phone", { length: 30 }),
    visits: integer("visits").notNull().default(0),
    notes: text("notes"),
    loyaltyPoints: integer("loyalty_points").notNull().default(0),
    totalSpend: integer("total_spend").notNull().default(0),
    manualClassification: varchar("manual_classification", { length: 50 }), // Regular, VIP, New
    manualRating: integer("manual_rating"), // 1–5
    createdAt: timestamp("created_at").notNull().defaultNow(),
  },
  (t) => [index("clients_provider_idx").on(t.providerId)],
);

export const insertClientSchema = createInsertSchema(clients).omit({
  id: true,
  createdAt: true,
});
export type InsertClient = z.infer<typeof insertClientSchema>;
export type Client = typeof clients.$inferSelect;

// ─── staff (per provider) ──────────────────────────────────────────────────────
export const staff = pgTable(
  "staff",
  {
    id: serial("id").primaryKey(),
    providerId: integer("provider_id")
      .notNull()
      .references(() => providers.id, { onDelete: "cascade" }),
    name: varchar("name", { length: 255 }).notNull(),
    role: varchar("role", { length: 100 }),
    email: varchar("email", { length: 255 }),
    phone: varchar("phone", { length: 30 }),
    isActive: boolean("is_active").notNull().default(true),
    username: varchar("username", { length: 100 }).unique(),
    secureLinkToken: varchar("secure_link_token", { length: 100 }),
    // Multi-tenant: role-based permissions
    permissions: varchar("permissions", { length: 500 }).notNull().default(""),
    invitedById: integer("invited_by_id").references(() => providers.id),
    createdAt: timestamp("created_at").notNull().defaultNow(),
  },
  (t) => [index("staff_provider_idx").on(t.providerId)],
);

export const insertStaffSchema = createInsertSchema(staff).omit({
  id: true,
  createdAt: true,
});
export type InsertStaff = z.infer<typeof insertStaffSchema>;
export type StaffMember = typeof staff.$inferSelect;

// ─── bookings ─────────────────────────────────────────────────────────────────
export const bookings = pgTable(
  "bookings",
  {
    id: serial("id").primaryKey(),
    providerId: integer("provider_id")
      .notNull()
      .references(() => providers.id, { onDelete: "cascade" }),
    clientId: integer("client_id").references(() => clients.id, {
      onDelete: "set null",
    }),
    staffId: integer("staff_id").references(() => staff.id, {
      onDelete: "set null",
    }),
    clientName: varchar("client_name", { length: 255 }).notNull(),
    clientPhone: varchar("client_phone", { length: 30 }),
    serviceId: varchar("service_id", { length: 50 }),
    serviceName: varchar("service_name", { length: 255 }),
    branchId: varchar("branch_id", { length: 50 }),
    date: date("date").notNull(),
    time: varchar("time", { length: 10 }).notNull(),
    duration: integer("duration").notNull().default(60),
    price: integer("price").notNull().default(0),
    status: bookingStatusEnum("status").notNull().default("confirmed"),
    notes: text("notes"),
    source: bookingSourceEnum("source").notNull().default("manual"),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at").notNull().defaultNow(),
  },
  (t) => [
    index("bookings_provider_date_idx").on(t.providerId, t.date),
    index("bookings_staff_idx").on(t.staffId),
  ],
);

export const insertBookingSchema = createInsertSchema(bookings).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});
export type InsertBooking = z.infer<typeof insertBookingSchema>;
export type Booking = typeof bookings.$inferSelect;

// ─── otp_sessions ─────────────────────────────────────────────────────────────
export const otpSessions = pgTable(
  "otp_sessions",
  {
    id: serial("id").primaryKey(),
    username: varchar("username", { length: 100 }).notNull(),
    email: varchar("email", { length: 255 }).notNull(),
    otp: varchar("otp", { length: 10 }).notNull(),
    expiresAt: timestamp("expires_at").notNull(),
    used: boolean("used").notNull().default(false),
    failedAttempts: integer("failed_attempts").notNull().default(0),
    createdAt: timestamp("created_at").notNull().defaultNow(),
  },
  (t) => [index("otp_username_idx").on(t.username)],
);

export const insertOtpSessionSchema = createInsertSchema(otpSessions).omit({
  id: true,
  createdAt: true,
});
export type InsertOtpSession = z.infer<typeof insertOtpSessionSchema>;
export type OtpSession = typeof otpSessions.$inferSelect;

// ─── provider_services (for online booking portal) ────────────────────────────
export const providerServices = pgTable(
  "provider_services",
  {
    id: serial("id").primaryKey(),
    providerId: integer("provider_id")
      .notNull()
      .references(() => providers.id, { onDelete: "cascade" }),
    nameAr: varchar("name_ar", { length: 200 }).notNull(),
    nameEn: varchar("name_en", { length: 200 }).notNull(),
    price: integer("price").notNull().default(0),
    duration: integer("duration").notNull().default(60),
    categoryAr: varchar("category_ar", { length: 100 }),
    categoryEn: varchar("category_en", { length: 100 }),
    isActive: boolean("is_active").notNull().default(true),
    sortOrder: integer("sort_order").notNull().default(0),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at").notNull().defaultNow(),
  },
  (t) => [index("services_provider_idx").on(t.providerId)],
);

export const insertProviderServiceSchema = createInsertSchema(providerServices).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});
export type InsertProviderService = z.infer<typeof insertProviderServiceSchema>;
export type ProviderService = typeof providerServices.$inferSelect;

// ─── subscription_packages ────────────────────────────────────────────────────
export const subscriptionPackages = pgTable("subscription_packages", {
  id: serial("id").primaryKey(),
  tier: packageTierEnum("tier").notNull().unique(),
  nameAr: varchar("name_ar", { length: 100 }).notNull(),
  nameEn: varchar("name_en", { length: 100 }).notNull(),
  priceMonthly: integer("price_monthly").notNull(),
  priceYearly: integer("price_yearly").notNull(),
  featuresJson: text("features_json").notNull().default("[]"),
  isPopular: boolean("is_popular").notNull().default(false),
  stripePriceMonthlyId: varchar("stripe_price_monthly_id", { length: 100 }),
  stripePriceYearlyId: varchar("stripe_price_yearly_id", { length: 100 }),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const insertPackageSchema = createInsertSchema(
  subscriptionPackages,
).omit({ id: true, createdAt: true });
export type InsertPackage = z.infer<typeof insertPackageSchema>;
export type SubscriptionPackage = typeof subscriptionPackages.$inferSelect;

// ─── feedback ─────────────────────────────────────────────────────────────────
export const feedbackTable = pgTable("feedback", {
  id: serial("id").primaryKey(),
  type: varchar("type", { length: 20 }).notNull().default("general"),
  message: text("message").notNull(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

// ─── staff_credentials (multi-tenant staff auth) ───────────────────────────────
export const staffCredentials = pgTable("staff_credentials", {
  id:                       serial("id").primaryKey(),
  staffId:                  integer("staff_id").notNull().unique().references(() => staff.id, { onDelete: "cascade" }),
  tenantId:                 integer("tenant_id").notNull().references(() => providers.id, { onDelete: "cascade" }),
  passwordHash:             varchar("password_hash", { length: 255 }),
  invitationToken:          varchar("invitation_token", { length: 128 }).unique(),
  invitationTokenExpiresAt: timestamp("invitation_token_expires_at"),
  invitedAt:                timestamp("invited_at"),
  acceptedAt:               timestamp("accepted_at"),
  isInvitationUsed:         boolean("is_invitation_used").notNull().default(false),
  lastLoginAt:              timestamp("last_login_at"),
  createdAt:                timestamp("created_at").notNull().defaultNow(),
  updatedAt:                timestamp("updated_at").notNull().defaultNow(),
});

// ─── audit_logs (per-tenant operation log) ─────────────────────────────────────
export const auditLogs = pgTable(
  "audit_logs",
  {
    id:           serial("id").primaryKey(),
    tenantId:     integer("tenant_id").notNull().references(() => providers.id, { onDelete: "cascade" }),
    actorId:      integer("actor_id").notNull(),
    actorType:    varchar("actor_type", { length: 20 }).notNull(),   // 'owner' | 'staff'
    actorRole:    varchar("actor_role", { length: 50 }),
    action:       varchar("action", { length: 100 }).notNull(),
    resourceType: varchar("resource_type", { length: 50 }),
    resourceId:   integer("resource_id"),
    metadata:     text("metadata"),  // JSON
    ipAddress:    varchar("ip_address", { length: 45 }),
    createdAt:    timestamp("created_at").notNull().defaultNow(),
  },
  (t) => [index("audit_tenant_created_idx").on(t.tenantId, t.createdAt)],
);

// ─── approval_requests (flexible approval workflow) ────────────────────────────
export const approvalRequests = pgTable(
  "approval_requests",
  {
    id:                  serial("id").primaryKey(),
    tenantId:            integer("tenant_id").notNull().references(() => providers.id, { onDelete: "cascade" }),
    requesterId:         integer("requester_id").notNull(),
    requesterType:       varchar("requester_type", { length: 20 }).notNull().default("staff"),
    requesterName:       varchar("requester_name", { length: 255 }),
    actionType:          varchar("action_type", { length: 50 }).notNull(),
    resourceType:        varchar("resource_type", { length: 50 }),
    resourceId:          integer("resource_id"),
    payload:             text("payload").notNull(),        // JSON: proposed changes
    currentValue:        text("current_value"),            // JSON: current state
    status:              varchar("status", { length: 20 }).notNull().default("pending"),
    reviewerId:          integer("reviewer_id"),
    reviewerType:        varchar("reviewer_type", { length: 20 }),
    reviewerNote:        text("reviewer_note"),
    notificationSentAt:  timestamp("notification_sent_at"),
    requestedAt:         timestamp("requested_at").notNull().defaultNow(),
    reviewedAt:          timestamp("reviewed_at"),
    expiresAt:           timestamp("expires_at").notNull(),
  },
  (t) => [
    index("approval_tenant_status_idx").on(t.tenantId, t.status),
  ],
);

export const insertFeedbackSchema = createInsertSchema(feedbackTable).omit({
  id: true,
  createdAt: true,
});
export type InsertFeedback = z.infer<typeof insertFeedbackSchema>;
export type Feedback = typeof feedbackTable.$inferSelect;
