import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

export async function up({ db, payload, req }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
   CREATE TYPE "public"."enum_projects_built_type" AS ENUM('photo', 'video');
  CREATE TYPE "public"."enum_projects_built_provider" AS ENUM('kinescope', 'vk');
  CREATE TYPE "public"."enum_projects_built_content_source" AS ENUM('mock', 'database');
  ALTER TABLE "projects_built" ALTER COLUMN "image" DROP NOT NULL;
  ALTER TABLE "projects_built" ADD COLUMN "type" "enum_projects_built_type" DEFAULT 'photo' NOT NULL;
  ALTER TABLE "projects_built" ADD COLUMN "provider" "enum_projects_built_provider";
  ALTER TABLE "projects_built" ADD COLUMN "video_url" varchar;
  ALTER TABLE "projects_built" ADD COLUMN "photo_id" integer;
  ALTER TABLE "projects" ADD COLUMN "built_content_source" "enum_projects_built_content_source" DEFAULT 'mock';
  ALTER TABLE "projects_built" ADD CONSTRAINT "projects_built_photo_id_media_id_fk" FOREIGN KEY ("photo_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  CREATE INDEX "projects_built_photo_idx" ON "projects_built" USING btree ("photo_id");`)
}

export async function down({ db, payload, req }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
   ALTER TABLE "projects_built" DROP CONSTRAINT "projects_built_photo_id_media_id_fk";

  DROP INDEX "projects_built_photo_idx";
  ALTER TABLE "projects_built" ALTER COLUMN "image" SET NOT NULL;
  ALTER TABLE "projects_built" DROP COLUMN "type";
  ALTER TABLE "projects_built" DROP COLUMN "provider";
  ALTER TABLE "projects_built" DROP COLUMN "video_url";
  ALTER TABLE "projects_built" DROP COLUMN "photo_id";
  ALTER TABLE "projects" DROP COLUMN "built_content_source";
  DROP TYPE "public"."enum_projects_built_type";
  DROP TYPE "public"."enum_projects_built_provider";
  DROP TYPE "public"."enum_projects_built_content_source";`)
}
