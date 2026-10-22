import { type MigrateDownArgs, type MigrateUpArgs, sql } from '@payloadcms/db-postgres'

export async function up({ db }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
CREATE TABLE "optimization_config_versions" (
	"id" uuid PRIMARY KEY NOT NULL,
	"created_at" timestamp (3) with time zone DEFAULT now() NOT NULL,
	"content_hash" varchar(64) NOT NULL,
	"config" jsonb NOT NULL
);

CREATE TABLE "optimization_decisions" (
	"id" uuid PRIMARY KEY NOT NULL,
	"subject_key" text,
	"session_key" text,
	"region" text NOT NULL,
	"mode" text NOT NULL,
	"config_version" uuid NOT NULL,
	"policy_version" text NOT NULL,
	"model_version" text NOT NULL,
	"candidate_set_hash" varchar(64) NOT NULL,
	"candidate_snapshot" jsonb NOT NULL,
	"assigned_at" timestamp (3) with time zone NOT NULL,
	"expires_at" timestamp (3) with time zone NOT NULL,
	"invalidated_at" timestamp (3) with time zone,
	CONSTRAINT "ao_decisions_region_check" CHECK ("optimization_decisions"."region" IN ('nn','msk')),
	CONSTRAINT "ao_decisions_mode_check" CHECK ("optimization_decisions"."mode" IN ('manual','hybrid','automatic')),
	CONSTRAINT "ao_decisions_expiry_check" CHECK ("optimization_decisions"."expires_at" > "optimization_decisions"."assigned_at")
);

CREATE TABLE "optimization_assignment_heads" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"subject_key" text NOT NULL,
	"region" text NOT NULL,
	"scope" text NOT NULL,
	"current_decision_id" uuid,
	"revision" integer DEFAULT 0 NOT NULL,
	CONSTRAINT "ao_heads_context_unique" UNIQUE("subject_key","region","scope"),
	CONSTRAINT "ao_heads_region_check" CHECK ("optimization_assignment_heads"."region" IN ('nn','msk')),
	CONSTRAINT "ao_heads_revision_check" CHECK ("optimization_assignment_heads"."revision" >= 0)
);

CREATE TABLE "optimization_decision_items" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"decision_id" uuid NOT NULL,
	"project_id" integer,
	"project_code" varchar(8) NOT NULL,
	"slot_position" smallint NOT NULL,
	"origin" text NOT NULL,
	"sampling_trace" jsonb NOT NULL,
	CONSTRAINT "ao_items_position_unique" UNIQUE("decision_id","slot_position"),
	CONSTRAINT "ao_items_project_unique" UNIQUE("decision_id","project_id"),
	CONSTRAINT "ao_items_code_unique" UNIQUE("decision_id","project_code"),
	CONSTRAINT "ao_items_exposure_key" UNIQUE("decision_id","project_code","slot_position"),
	CONSTRAINT "ao_items_position_check" CHECK ("optimization_decision_items"."slot_position" BETWEEN 1 AND 6),
	CONSTRAINT "ao_items_origin_check" CHECK ("optimization_decision_items"."origin" IN ('manual','exploration','posterior','fallback')),
	CONSTRAINT "ao_items_code_check" CHECK ("optimization_decision_items"."project_code" ~ '^[A-Z0-9]{8}$' AND length(regexp_replace("optimization_decision_items"."project_code", '[^0-9]', '', 'g')) = 2)
);

CREATE TABLE "optimization_exposures" (
	"id" uuid PRIMARY KEY NOT NULL,
	"decision_id" uuid NOT NULL,
	"project_code" varchar(8) NOT NULL,
	"position" smallint NOT NULL,
	"scope_key" text NOT NULL,
	"region" text NOT NULL,
	"visible_at" timestamp (3) with time zone NOT NULL,
	"received_at" timestamp (3) with time zone DEFAULT now() NOT NULL,
	"visibility_rule_version" text NOT NULL,
	CONSTRAINT "ao_exposures_scope_unique" UNIQUE("decision_id","project_code","position","scope_key"),
	CONSTRAINT "ao_exposures_region_check" CHECK ("optimization_exposures"."region" IN ('nn','msk'))
);

CREATE TABLE "optimization_events" (
	"event_id" uuid PRIMARY KEY NOT NULL,
	"payload_hash" varchar(64) NOT NULL,
	"event_type" text NOT NULL,
	"schema_version" smallint NOT NULL,
	"occurred_at" timestamp (3) with time zone NOT NULL,
	"received_at" timestamp (3) with time zone DEFAULT now() NOT NULL,
	"project_id" integer,
	"project_code" varchar(8),
	"decision_id" uuid,
	"exposure_id" uuid,
	"subject_key" text,
	"session_key" text,
	"region" text NOT NULL,
	"placement" text,
	"component" text,
	"position" smallint,
	"payload" jsonb NOT NULL,
	CONSTRAINT "ao_events_version_check" CHECK ("optimization_events"."schema_version" = 1),
	CONSTRAINT "ao_events_region_check" CHECK ("optimization_events"."region" IN ('nn','msk')),
	CONSTRAINT "ao_events_position_check" CHECK ("optimization_events"."position" IS NULL OR "optimization_events"."position" BETWEEN 1 AND 6),
	CONSTRAINT "ao_events_type_check" CHECK ("optimization_events"."event_type" IN ('ranking_assigned','project_impression','project_opened','project_liked','project_unliked','project_shared','form_opened','lead_accepted','lead_delivery_updated','regional_context_changed'))
);

ALTER TABLE "optimization_decisions" ADD CONSTRAINT "ao_decisions_config_fk" FOREIGN KEY ("config_version") REFERENCES "public"."optimization_config_versions"("id") ON DELETE no action ON UPDATE no action;
ALTER TABLE "optimization_assignment_heads" ADD CONSTRAINT "ao_heads_decision_fk" FOREIGN KEY ("current_decision_id") REFERENCES "public"."optimization_decisions"("id") ON DELETE set null ON UPDATE no action;
ALTER TABLE "optimization_decision_items" ADD CONSTRAINT "ao_items_decision_fk" FOREIGN KEY ("decision_id") REFERENCES "public"."optimization_decisions"("id") ON DELETE no action ON UPDATE no action;
ALTER TABLE "optimization_decision_items" ADD CONSTRAINT "ao_items_project_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE set null ON UPDATE no action;
ALTER TABLE "optimization_exposures" ADD CONSTRAINT "ao_exposures_item_fk" FOREIGN KEY ("decision_id","project_code","position") REFERENCES "public"."optimization_decision_items"("decision_id","project_code","slot_position") ON DELETE no action ON UPDATE no action;
ALTER TABLE "optimization_events" ADD CONSTRAINT "ao_events_project_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE set null ON UPDATE no action;
ALTER TABLE "optimization_events" ADD CONSTRAINT "ao_events_decision_fk" FOREIGN KEY ("decision_id") REFERENCES "public"."optimization_decisions"("id") ON DELETE no action ON UPDATE no action;
ALTER TABLE "optimization_events" ADD CONSTRAINT "ao_events_exposure_fk" FOREIGN KEY ("exposure_id") REFERENCES "public"."optimization_exposures"("id") ON DELETE no action ON UPDATE no action;
CREATE INDEX "ao_decisions_context_idx" ON "optimization_decisions" USING btree ("subject_key","region","expires_at");
CREATE INDEX "ao_exposures_time_idx" ON "optimization_exposures" USING btree ("visible_at");
CREATE INDEX "ao_events_type_time_idx" ON "optimization_events" USING btree ("event_type","occurred_at");
CREATE INDEX "ao_events_project_time_idx" ON "optimization_events" USING btree ("project_id","occurred_at");
CREATE INDEX "ao_events_decision_time_idx" ON "optimization_events" USING btree ("decision_id","occurred_at");
CREATE INDEX "ao_events_context_time_idx" ON "optimization_events" USING btree ("subject_key","session_key","occurred_at");
  `)
}

export async function down({ db }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
    DROP TABLE "optimization_events";
    DROP TABLE "optimization_exposures";
    DROP TABLE "optimization_decision_items";
    DROP TABLE "optimization_assignment_heads";
    DROP TABLE "optimization_decisions";
    DROP TABLE "optimization_config_versions";
  `)
}
