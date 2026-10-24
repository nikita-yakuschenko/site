import { sql, type MigrateUpArgs, type MigrateDownArgs } from '@payloadcms/db-postgres'

export async function up({ db }: MigrateUpArgs) {
  await db.execute(sql`
CREATE TYPE "public"."enum_referral_participants_status" AS ENUM('pending', 'active', 'blocked');
CREATE TYPE "public"."enum_events_status" AS ENUM('draft', 'published', 'completed', 'cancelled');
CREATE TYPE "public"."enum_event_registrations_status" AS ENUM('pending', 'confirmed', 'cancelled', 'attended');
CREATE TYPE "public"."enum_automation_jobs_status" AS ENUM('queued', 'running', 'completed', 'failed', 'cancelled');
CREATE TABLE "referral_participants" (
	"id" serial PRIMARY KEY NOT NULL,
	"key" varchar NOT NULL,
	"name" varchar NOT NULL,
	"email" varchar,
	"phone" varchar,
	"crm_contact_id" varchar,
	"crm_deal_ids" jsonb DEFAULT '[]'::jsonb,
	"confirmed_at" timestamp(3) with time zone,
	"token_version" numeric,
	"imported_at" timestamp(3) with time zone,
	"source_data" jsonb,
	"code" varchar NOT NULL,
	"referral_url" varchar,
	"status" "enum_referral_participants_status" DEFAULT 'pending' NOT NULL,
	"notes" varchar,
	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
);

CREATE TABLE "events_programme" (
	"_order" integer NOT NULL,
	"_parent_id" integer NOT NULL,
	"id" varchar PRIMARY KEY NOT NULL,
	"time" varchar,
	"title" varchar NOT NULL,
	"description" varchar
);

CREATE TABLE "events" (
	"id" serial PRIMARY KEY NOT NULL,
	"title" varchar NOT NULL,
	"slug" varchar NOT NULL,
	"status" "enum_events_status" DEFAULT 'draft',
	"description" varchar,
	"starts_at" timestamp(3) with time zone NOT NULL,
	"ends_at" timestamp(3) with time zone NOT NULL,
	"timezone" varchar DEFAULT 'Europe/Moscow',
	"landing_url" varchar,
	"address" varchar,
	"landmark" varchar,
	"latitude" numeric,
	"longitude" numeric,
	"marker_label" varchar DEFAULT 'Авангард Строй',
	"route_url" varchar,
	"phone" varchar,
	"registration_enabled" boolean DEFAULT false,
	"capacity" numeric,
	"require_confirmation" boolean DEFAULT true,
	"token_ttl_hours" numeric,
	"crm_title_match" varchar,
	"crm_confirmed_stage" varchar,
	"confirmation_email_subject" varchar,
	"confirmation_email_html" varchar,
	"confirmation_email_text" varchar,
	"programme_email_subject" varchar,
	"programme_email_html" varchar,
	"programme_email_text" varchar,
	"reminder_email_subject" varchar,
	"reminder_email_html" varchar,
	"reminder_email_text" varchar,
	"reminder_enabled" boolean DEFAULT false,
	"reminder_hours_before" numeric,
	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
);

CREATE TABLE "event_registrations" (
	"id" serial PRIMARY KEY NOT NULL,
	"key" varchar NOT NULL,
	"name" varchar NOT NULL,
	"email" varchar,
	"phone" varchar,
	"crm_contact_id" varchar,
	"crm_deal_ids" jsonb DEFAULT '[]'::jsonb,
	"confirmed_at" timestamp(3) with time zone,
	"token_version" numeric,
	"imported_at" timestamp(3) with time zone,
	"source_data" jsonb,
	"event_slug" varchar NOT NULL,
	"status" "enum_event_registrations_status" DEFAULT 'pending' NOT NULL,
	"notes" varchar,
	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
);

CREATE TABLE "automation_jobs" (
	"id" serial PRIMARY KEY NOT NULL,
	"key" varchar NOT NULL,
	"kind" varchar NOT NULL,
	"data" jsonb NOT NULL,
	"status" "enum_automation_jobs_status" DEFAULT 'queued' NOT NULL,
	"attempts" numeric,
	"run_at" timestamp(3) with time zone NOT NULL,
	"lease" varchar,
	"locked_at" timestamp(3) with time zone,
	"last_error" varchar,
	"result" jsonb,
	"completed_at" timestamp(3) with time zone,
	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
);

CREATE TABLE "automation_imports" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" varchar NOT NULL,
	"status" varchar NOT NULL,
	"report" jsonb,
	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
);

CREATE TABLE "automation_settings" (
	"id" serial PRIMARY KEY NOT NULL,
	"config" jsonb,
	"vault" jsonb,
	"cutover" jsonb,
	"updated_at" timestamp(3) with time zone,
	"created_at" timestamp(3) with time zone
);

ALTER TABLE "payload_locked_documents_rels" ADD COLUMN "referral_participants_id" integer;
ALTER TABLE "payload_locked_documents_rels" ADD COLUMN "events_id" integer;
ALTER TABLE "payload_locked_documents_rels" ADD COLUMN "event_registrations_id" integer;
ALTER TABLE "payload_locked_documents_rels" ADD COLUMN "automation_jobs_id" integer;
ALTER TABLE "payload_locked_documents_rels" ADD COLUMN "automation_imports_id" integer;
ALTER TABLE "events_programme" ADD CONSTRAINT "events_programme_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."events"("id") ON DELETE cascade ON UPDATE no action;
CREATE UNIQUE INDEX "referral_participants_key_idx" ON "referral_participants" USING btree ("key");
CREATE INDEX "referral_participants_email_idx" ON "referral_participants" USING btree ("email");
CREATE INDEX "referral_participants_crm_contact_id_idx" ON "referral_participants" USING btree ("crm_contact_id");
CREATE UNIQUE INDEX "referral_participants_code_idx" ON "referral_participants" USING btree ("code");
CREATE INDEX "referral_participants_updated_at_idx" ON "referral_participants" USING btree ("updated_at");
CREATE INDEX "referral_participants_created_at_idx" ON "referral_participants" USING btree ("created_at");
CREATE INDEX "events_programme_order_idx" ON "events_programme" USING btree ("_order");
CREATE INDEX "events_programme_parent_id_idx" ON "events_programme" USING btree ("_parent_id");
CREATE UNIQUE INDEX "events_slug_idx" ON "events" USING btree ("slug");
CREATE INDEX "events_updated_at_idx" ON "events" USING btree ("updated_at");
CREATE INDEX "events_created_at_idx" ON "events" USING btree ("created_at");
CREATE UNIQUE INDEX "event_registrations_key_idx" ON "event_registrations" USING btree ("key");
CREATE INDEX "event_registrations_email_idx" ON "event_registrations" USING btree ("email");
CREATE INDEX "event_registrations_crm_contact_id_idx" ON "event_registrations" USING btree ("crm_contact_id");
CREATE INDEX "event_registrations_event_slug_idx" ON "event_registrations" USING btree ("event_slug");
CREATE INDEX "event_registrations_updated_at_idx" ON "event_registrations" USING btree ("updated_at");
CREATE INDEX "event_registrations_created_at_idx" ON "event_registrations" USING btree ("created_at");
CREATE UNIQUE INDEX "automation_jobs_key_idx" ON "automation_jobs" USING btree ("key");
CREATE INDEX "automation_jobs_kind_idx" ON "automation_jobs" USING btree ("kind");
CREATE INDEX "automation_jobs_run_at_idx" ON "automation_jobs" USING btree ("run_at");
CREATE INDEX "automation_jobs_updated_at_idx" ON "automation_jobs" USING btree ("updated_at");
CREATE INDEX "automation_jobs_created_at_idx" ON "automation_jobs" USING btree ("created_at");
CREATE INDEX "automation_imports_updated_at_idx" ON "automation_imports" USING btree ("updated_at");
CREATE INDEX "automation_imports_created_at_idx" ON "automation_imports" USING btree ("created_at");
ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_referral_participants_fk" FOREIGN KEY ("referral_participants_id") REFERENCES "public"."referral_participants"("id") ON DELETE cascade ON UPDATE no action;
ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_events_fk" FOREIGN KEY ("events_id") REFERENCES "public"."events"("id") ON DELETE cascade ON UPDATE no action;
ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_event_registrations_fk" FOREIGN KEY ("event_registrations_id") REFERENCES "public"."event_registrations"("id") ON DELETE cascade ON UPDATE no action;
ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_automation_jobs_fk" FOREIGN KEY ("automation_jobs_id") REFERENCES "public"."automation_jobs"("id") ON DELETE cascade ON UPDATE no action;
ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_automation_imports_fk" FOREIGN KEY ("automation_imports_id") REFERENCES "public"."automation_imports"("id") ON DELETE cascade ON UPDATE no action;
CREATE INDEX "payload_locked_documents_rels_referral_participants_id_idx" ON "payload_locked_documents_rels" USING btree ("referral_participants_id");
CREATE INDEX "payload_locked_documents_rels_events_id_idx" ON "payload_locked_documents_rels" USING btree ("events_id");
CREATE INDEX "payload_locked_documents_rels_event_registrations_id_idx" ON "payload_locked_documents_rels" USING btree ("event_registrations_id");
CREATE INDEX "payload_locked_documents_rels_automation_jobs_id_idx" ON "payload_locked_documents_rels" USING btree ("automation_jobs_id");
CREATE INDEX "payload_locked_documents_rels_automation_imports_id_idx" ON "payload_locked_documents_rels" USING btree ("automation_imports_id");
  `)
}

// Operational data is retained on application rollback.
export async function down(_args: MigrateDownArgs) {}
