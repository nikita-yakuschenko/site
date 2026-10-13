import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

export async function up({ db, payload, req }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
   CREATE TYPE "public"."enum_projects_hero_content_source" AS ENUM('mock', 'database');
  ALTER TABLE "projects" ADD COLUMN "mobile_image_url" varchar;
  ALTER TABLE "projects" ADD COLUMN "hero_content_source" "enum_projects_hero_content_source" DEFAULT 'mock';`)
}

export async function down({ db, payload, req }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
   ALTER TABLE "projects" DROP COLUMN "mobile_image_url";
  ALTER TABLE "projects" DROP COLUMN "hero_content_source";
  DROP TYPE "public"."enum_projects_hero_content_source";`)
}
