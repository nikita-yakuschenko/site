import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

export async function up({ db, payload, req }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
   CREATE TYPE "public"."enum_lead_submissions_status" AS ENUM('pending', 'test', 'sent', 'failed');
  CREATE TYPE "public"."enum_lead_delivery_mode" AS ENUM('disabled', 'test', 'webhook');
  CREATE TABLE "lead_submissions" (
    "id" serial PRIMARY KEY NOT NULL,
    "request_id" varchar NOT NULL,
    "form_id" varchar NOT NULL,
    "status" "enum_lead_submissions_status" NOT NULL,
    "payload" jsonb NOT NULL,
    "updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
    "created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );

  CREATE TABLE "lead_delivery" (
    "id" serial PRIMARY KEY NOT NULL,
    "mode" "enum_lead_delivery_mode" DEFAULT 'disabled' NOT NULL,
    "url" varchar,
    "authorization_env" varchar,
    "updated_at" timestamp(3) with time zone,
    "created_at" timestamp(3) with time zone
  );

  ALTER TABLE "projects" ADD COLUMN "search_description" varchar;
  ALTER TABLE "payload_locked_documents_rels" ADD COLUMN "lead_submissions_id" integer;
  CREATE UNIQUE INDEX "lead_submissions_request_id_idx" ON "lead_submissions" USING btree ("request_id");
  CREATE INDEX "lead_submissions_updated_at_idx" ON "lead_submissions" USING btree ("updated_at");
  CREATE INDEX "lead_submissions_created_at_idx" ON "lead_submissions" USING btree ("created_at");
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_lead_submissions_fk" FOREIGN KEY ("lead_submissions_id") REFERENCES "public"."lead_submissions"("id") ON DELETE cascade ON UPDATE no action;
  CREATE INDEX "payload_locked_documents_rels_lead_submissions_id_idx" ON "payload_locked_documents_rels" USING btree ("lead_submissions_id");`)
}

export async function down({ db, payload, req }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
   ALTER TABLE "lead_submissions" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "lead_delivery" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "payload_locked_documents_rels" DROP CONSTRAINT "payload_locked_documents_rels_lead_submissions_fk";
  DROP TABLE "lead_submissions" CASCADE;
  DROP TABLE "lead_delivery" CASCADE;

  DROP INDEX "payload_locked_documents_rels_lead_submissions_id_idx";
  ALTER TABLE "projects" DROP COLUMN "search_description";
  ALTER TABLE "payload_locked_documents_rels" DROP COLUMN "lead_submissions_id";
  DROP TYPE "public"."enum_lead_submissions_status";
  DROP TYPE "public"."enum_lead_delivery_mode";`)
}
