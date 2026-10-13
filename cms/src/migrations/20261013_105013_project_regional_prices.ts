import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

export async function up({ db }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
   CREATE TYPE "public"."enum_project_prices_configuration" AS ENUM('start', 'standard', 'project', 'turnkey');
  CREATE TYPE "public"."enum_project_prices_region" AS ENUM('nn', 'msk');
  ALTER TABLE "projects_configurations" ALTER COLUMN "key" SET DATA TYPE text;
  DROP TYPE "public"."enum_projects_configurations_key";
  CREATE TYPE "public"."enum_projects_configurations_key" AS ENUM('start', 'standard', 'project', 'turnkey');
  ALTER TABLE "projects_configurations" ALTER COLUMN "key" SET DATA TYPE "public"."enum_projects_configurations_key" USING "key"::"public"."enum_projects_configurations_key";
  CREATE TABLE "project_prices" (
    "id" serial PRIMARY KEY NOT NULL,
    "lookup_key" varchar NOT NULL,
    "project_id" integer NOT NULL,
    "configuration" "enum_project_prices_configuration" NOT NULL,
    "region" "enum_project_prices_region" NOT NULL,
    "price" numeric NOT NULL,
    "updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
    "created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );

  ALTER TABLE "projects" ADD COLUMN "legacy_configurations" jsonb;
  ALTER TABLE "payload_locked_documents_rels" ADD COLUMN "project_prices_id" integer;
  ALTER TABLE "project_prices" ADD CONSTRAINT "project_prices_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE set null ON UPDATE no action;
  CREATE UNIQUE INDEX "project_prices_lookup_key_idx" ON "project_prices" USING btree ("lookup_key");
  CREATE INDEX "project_prices_project_idx" ON "project_prices" USING btree ("project_id");
  CREATE INDEX "project_prices_updated_at_idx" ON "project_prices" USING btree ("updated_at");
  CREATE INDEX "project_prices_created_at_idx" ON "project_prices" USING btree ("created_at");
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_project_prices_fk" FOREIGN KEY ("project_prices_id") REFERENCES "public"."project_prices"("id") ON DELETE cascade ON UPDATE no action;
  CREATE INDEX "payload_locked_documents_rels_project_prices_id_idx" ON "payload_locked_documents_rels" USING btree ("project_prices_id");`)
  // Project normalization runs after all schema migrations: the current Payload
  // model already includes columns introduced by later migrations.
}

export async function down({ db, payload, req }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
   ALTER TABLE "project_prices" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "payload_locked_documents_rels" DROP CONSTRAINT "payload_locked_documents_rels_project_prices_fk";
  DROP TABLE "project_prices" CASCADE;
  DELETE FROM "projects_configurations" WHERE "key"::text = 'turnkey';

  ALTER TABLE "projects_configurations" ALTER COLUMN "key" SET DATA TYPE text;
  DROP TYPE "public"."enum_projects_configurations_key";
  CREATE TYPE "public"."enum_projects_configurations_key" AS ENUM('start', 'standard', 'project');
  ALTER TABLE "projects_configurations" ALTER COLUMN "key" SET DATA TYPE "public"."enum_projects_configurations_key" USING "key"::"public"."enum_projects_configurations_key";
  DROP INDEX "payload_locked_documents_rels_project_prices_id_idx";
  ALTER TABLE "projects" DROP COLUMN "legacy_configurations";
  ALTER TABLE "payload_locked_documents_rels" DROP COLUMN "project_prices_id";
  DROP TYPE "public"."enum_project_prices_configuration";
  DROP TYPE "public"."enum_project_prices_region";`)
}
