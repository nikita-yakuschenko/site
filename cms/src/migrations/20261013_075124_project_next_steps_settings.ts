import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

export async function up({ db, payload, req }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
   CREATE TYPE "public"."enum_projects_next_steps_settings_order" AS ENUM('visit-first', 'secondary-first');
  ALTER TABLE "projects" ADD COLUMN "next_steps_settings_enabled" boolean DEFAULT true;
  ALTER TABLE "projects" ADD COLUMN "next_steps_settings_visit_enabled" boolean DEFAULT true;
  ALTER TABLE "projects" ADD COLUMN "next_steps_settings_secondary_enabled" boolean DEFAULT true;
  ALTER TABLE "projects" ADD COLUMN "next_steps_settings_order" "enum_projects_next_steps_settings_order" DEFAULT 'visit-first';`)
}

export async function down({ db, payload, req }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
   ALTER TABLE "projects" DROP COLUMN "next_steps_settings_enabled";
  ALTER TABLE "projects" DROP COLUMN "next_steps_settings_visit_enabled";
  ALTER TABLE "projects" DROP COLUMN "next_steps_settings_secondary_enabled";
  ALTER TABLE "projects" DROP COLUMN "next_steps_settings_order";
  DROP TYPE "public"."enum_projects_next_steps_settings_order";`)
}
