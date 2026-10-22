import { type MigrateDownArgs, type MigrateUpArgs, sql } from '@payloadcms/db-postgres'

export async function up({ db }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
CREATE TABLE "project_like_baselines" (
	"project_id" integer PRIMARY KEY NOT NULL,
	"baseline_count" integer NOT NULL,
	"new_active_count" integer DEFAULT 0 NOT NULL,
	"retired_legacy_count" integer DEFAULT 0 NOT NULL,
	"evidence_hash" varchar(64) NOT NULL,
	"reconciliation_version" text NOT NULL,
	"captured_at" timestamp (3) with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "ao_like_baselines_counts_check" CHECK ("project_like_baselines"."baseline_count" >= 0 AND "project_like_baselines"."new_active_count" >= 0 AND "project_like_baselines"."retired_legacy_count" BETWEEN 0 AND "project_like_baselines"."baseline_count")
);

CREATE TABLE "project_likes" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"project_id" integer NOT NULL,
	"subject_key" varchar(64) NOT NULL,
	"liked" boolean NOT NULL,
	"revision" integer DEFAULT 0 NOT NULL,
	"contribution" text NOT NULL,
	"source" text NOT NULL,
	"migration_marker" uuid,
	"updated_at" timestamp (3) with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "ao_likes_subject_project_unique" UNIQUE("project_id","subject_key"),
	CONSTRAINT "ao_likes_revision_check" CHECK ("project_likes"."revision" >= 0),
	CONSTRAINT "ao_likes_contribution_check" CHECK ("project_likes"."contribution" IN ('new','legacy','pending'))
);

CREATE TABLE "project_like_operations" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"operation_id" uuid NOT NULL,
	"subject_key" varchar(64) NOT NULL,
	"body_hash" varchar(64) NOT NULL,
	"response" jsonb NOT NULL,
	"created_at" timestamp (3) with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "ao_like_operations_subject_unique" UNIQUE("subject_key","operation_id")
);

CREATE TABLE "project_like_legacy_claims" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"project_id" integer NOT NULL,
	"key_hash" varchar(64) NOT NULL,
	"subject_key" varchar(64) NOT NULL,
	"claimed_at" timestamp (3) with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "ao_like_claims_key_unique" UNIQUE("project_id","key_hash")
);

CREATE TABLE "project_like_migration_batches" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"migration_id" uuid NOT NULL,
	"subject_key" varchar(64) NOT NULL,
	"body_hash" varchar(64) NOT NULL,
	"response" jsonb NOT NULL,
	"created_at" timestamp (3) with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "ao_like_batches_subject_unique" UNIQUE("subject_key","migration_id")
);

ALTER TABLE "project_like_baselines" ADD CONSTRAINT "ao_like_baselines_project_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE cascade ON UPDATE no action;
ALTER TABLE "project_likes" ADD CONSTRAINT "ao_likes_project_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE cascade ON UPDATE no action;
ALTER TABLE "project_like_legacy_claims" ADD CONSTRAINT "ao_like_claims_project_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE cascade ON UPDATE no action;
CREATE INDEX "ao_likes_subject_active_idx" ON "project_likes" USING btree ("subject_key","project_id") WHERE "project_likes"."liked";
  `)
}

export async function down({ db }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
    DROP TABLE "project_like_migration_batches";
    DROP TABLE "project_like_legacy_claims";
    DROP TABLE "project_like_operations";
    DROP TABLE "project_likes";
    DROP TABLE "project_like_baselines";
  `)
}
