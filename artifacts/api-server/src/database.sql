CREATE TYPE "public"."booking_source" AS ENUM('manual', 'online');--> statement-breakpoint
CREATE TYPE "public"."booking_status" AS ENUM('confirmed', 'cancelled', 'attended', 'absent', 'new');--> statement-breakpoint
CREATE TYPE "public"."churn_risk" AS ENUM('low', 'medium', 'high');--> statement-breakpoint
CREATE TYPE "public"."package_tier" AS ENUM('basic', 'pro', 'enterprise');--> statement-breakpoint
CREATE TYPE "public"."provider_status" AS ENUM('active', 'trial', 'suspended', 'pending');--> statement-breakpoint
CREATE TYPE "public"."subscription_status" AS ENUM('active', 'trial', 'cancelled', 'expired');--> statement-breakpoint
CREATE TYPE "public"."subscription_tier" AS ENUM('basic', 'pro', 'enterprise');--> statement-breakpoint
CREATE TABLE "approval_requests" (
	"id" serial PRIMARY KEY NOT NULL,
	"tenant_id" integer NOT NULL,
	"requester_id" integer NOT NULL,
	"requester_type" varchar(20) DEFAULT 'staff' NOT NULL,
	"requester_name" varchar(255),
	"action_type" varchar(50) NOT NULL,
	"resource_type" varchar(50),
	"resource_id" integer,
	"payload" text NOT NULL,
	"current_value" text,
	"status" varchar(20) DEFAULT 'pending' NOT NULL,
	"reviewer_id" integer,
	"reviewer_type" varchar(20),
	"reviewer_note" text,
	"notification_sent_at" timestamp,
	"requested_at" timestamp DEFAULT now() NOT NULL,
	"reviewed_at" timestamp,
	"expires_at" timestamp NOT NULL
);
--> statement-breakpoint
CREATE TABLE "audit_logs" (
	"id" serial PRIMARY KEY NOT NULL,
	"tenant_id" integer NOT NULL,
	"actor_id" integer NOT NULL,
	"actor_type" varchar(20) NOT NULL,
	"actor_role" varchar(50),
	"action" varchar(100) NOT NULL,
	"resource_type" varchar(50),
	"resource_id" integer,
	"metadata" text,
	"ip_address" varchar(45),
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "bookings" (
	"id" serial PRIMARY KEY NOT NULL,
	"provider_id" integer NOT NULL,
	"client_id" integer,
	"staff_id" integer,
	"client_name" varchar(255) NOT NULL,
	"client_phone" varchar(30),
	"service_id" varchar(50),
	"service_name" varchar(255),
	"branch_id" integer,
	"client_email" varchar(255),
	"date" date NOT NULL,
	"time" varchar(10) NOT NULL,
	"duration" integer DEFAULT 60 NOT NULL,
	"price" integer DEFAULT 0 NOT NULL,
	"status" "booking_status" DEFAULT 'confirmed' NOT NULL,
	"notes" text,
	"source" "booking_source" DEFAULT 'manual' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "clients" (
	"id" serial PRIMARY KEY NOT NULL,
	"provider_id" integer NOT NULL,
	"name" varchar(255) NOT NULL,
	"phone" varchar(30),
	"visits" integer DEFAULT 0 NOT NULL,
	"notes" text,
	"loyalty_points" integer DEFAULT 0 NOT NULL,
	"total_spend" integer DEFAULT 0 NOT NULL,
	"manual_classification" varchar(50),
	"manual_rating" integer,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "feedback" (
	"id" serial PRIMARY KEY NOT NULL,
	"type" varchar(20) DEFAULT 'general' NOT NULL,
	"message" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "otp_sessions" (
	"id" serial PRIMARY KEY NOT NULL,
	"username" varchar(100) NOT NULL,
	"email" varchar(255) NOT NULL,
	"otp" varchar(10) NOT NULL,
	"expires_at" timestamp NOT NULL,
	"used" boolean DEFAULT false NOT NULL,
	"failed_attempts" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "provider_services" (
	"id" serial PRIMARY KEY NOT NULL,
	"provider_id" integer NOT NULL,
	"name_ar" varchar(200) NOT NULL,
	"name_en" varchar(200) NOT NULL,
	"price" integer DEFAULT 0 NOT NULL,
	"duration" integer DEFAULT 60 NOT NULL,
	"category_ar" varchar(100),
	"category_en" varchar(100),
	"is_active" boolean DEFAULT true NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "providers" (
	"id" serial PRIMARY KEY NOT NULL,
	"username" varchar(100) NOT NULL,
	"email" varchar(255) NOT NULL,
	"name_ar" varchar(255) NOT NULL,
	"name_en" varchar(255) NOT NULL,
	"slug" varchar(100),
	"status" "provider_status" DEFAULT 'trial' NOT NULL,
	"subscription_tier" "subscription_tier" DEFAULT 'basic' NOT NULL,
	"subscription_status" "subscription_status" DEFAULT 'trial' NOT NULL,
	"churn_risk" "churn_risk" DEFAULT 'low' NOT NULL,
	"mrr" integer DEFAULT 0 NOT NULL,
	"online_booking_enabled" boolean DEFAULT false NOT NULL,
	"city" varchar(100),
	"phone" varchar(20),
	"stripe_customer_id" varchar(255),
	"stripe_subscription_id" varchar(255),
	"billing_cycle" varchar(10),
	"role" varchar(20) DEFAULT 'provider' NOT NULL,
	"logo_url" text,
	"password_hash" varchar(255),
	"subscription_ends_at" timestamp,
	"reminders_sent" varchar(30) DEFAULT '' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "providers_username_unique" UNIQUE("username"),
	CONSTRAINT "providers_email_unique" UNIQUE("email"),
	CONSTRAINT "providers_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
CREATE TABLE "staff" (
	"id" serial PRIMARY KEY NOT NULL,
	"provider_id" integer NOT NULL,
	"name" varchar(255) NOT NULL,
	"role" varchar(100),
	"email" varchar(255),
	"phone" varchar(30),
	"is_active" boolean DEFAULT true NOT NULL,
	"username" varchar(100),
	"secure_link_token" varchar(100),
	"permissions" varchar(500) DEFAULT '' NOT NULL,
	"invited_by_id" integer,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "staff_username_unique" UNIQUE("username")
);
--> statement-breakpoint
CREATE TABLE "staff_credentials" (
	"id" serial PRIMARY KEY NOT NULL,
	"staff_id" integer NOT NULL,
	"tenant_id" integer NOT NULL,
	"password_hash" varchar(255),
	"invitation_token" varchar(128),
	"invitation_token_expires_at" timestamp,
	"invited_at" timestamp,
	"accepted_at" timestamp,
	"is_invitation_used" boolean DEFAULT false NOT NULL,
	"last_login_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "staff_credentials_staff_id_unique" UNIQUE("staff_id"),
	CONSTRAINT "staff_credentials_invitation_token_unique" UNIQUE("invitation_token")
);
--> statement-breakpoint
CREATE TABLE "subscription_packages" (
	"id" serial PRIMARY KEY NOT NULL,
	"tier" "package_tier" NOT NULL,
	"name_ar" varchar(100) NOT NULL,
	"name_en" varchar(100) NOT NULL,
	"price_monthly" integer NOT NULL,
	"price_yearly" integer NOT NULL,
	"features_json" text DEFAULT '[]' NOT NULL,
	"is_popular" boolean DEFAULT false NOT NULL,
	"stripe_price_monthly_id" varchar(100),
	"stripe_price_yearly_id" varchar(100),
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "subscription_packages_tier_unique" UNIQUE("tier")
);
--> statement-breakpoint
ALTER TABLE "approval_requests" ADD CONSTRAINT "approval_requests_tenant_id_providers_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."providers"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_tenant_id_providers_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."providers"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "bookings" ADD CONSTRAINT "bookings_provider_id_providers_id_fk" FOREIGN KEY ("provider_id") REFERENCES "public"."providers"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "bookings" ADD CONSTRAINT "bookings_client_id_clients_id_fk" FOREIGN KEY ("client_id") REFERENCES "public"."clients"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "bookings" ADD CONSTRAINT "bookings_staff_id_staff_id_fk" FOREIGN KEY ("staff_id") REFERENCES "public"."staff"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "clients" ADD CONSTRAINT "clients_provider_id_providers_id_fk" FOREIGN KEY ("provider_id") REFERENCES "public"."providers"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "provider_services" ADD CONSTRAINT "provider_services_provider_id_providers_id_fk" FOREIGN KEY ("provider_id") REFERENCES "public"."providers"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "staff" ADD CONSTRAINT "staff_provider_id_providers_id_fk" FOREIGN KEY ("provider_id") REFERENCES "public"."providers"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "staff" ADD CONSTRAINT "staff_invited_by_id_providers_id_fk" FOREIGN KEY ("invited_by_id") REFERENCES "public"."providers"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "staff_credentials" ADD CONSTRAINT "staff_credentials_staff_id_staff_id_fk" FOREIGN KEY ("staff_id") REFERENCES "public"."staff"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "staff_credentials" ADD CONSTRAINT "staff_credentials_tenant_id_providers_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."providers"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "approval_tenant_status_idx" ON "approval_requests" USING btree ("tenant_id","status");--> statement-breakpoint
CREATE INDEX "audit_tenant_created_idx" ON "audit_logs" USING btree ("tenant_id","created_at");--> statement-breakpoint
CREATE INDEX "bookings_provider_date_idx" ON "bookings" USING btree ("provider_id","date");--> statement-breakpoint
CREATE INDEX "bookings_staff_idx" ON "bookings" USING btree ("staff_id");--> statement-breakpoint
CREATE INDEX "clients_provider_idx" ON "clients" USING btree ("provider_id");--> statement-breakpoint
CREATE INDEX "otp_username_idx" ON "otp_sessions" USING btree ("username");--> statement-breakpoint
CREATE INDEX "services_provider_idx" ON "provider_services" USING btree ("provider_id");--> statement-breakpoint
CREATE INDEX "staff_provider_idx" ON "staff" USING btree ("provider_id");