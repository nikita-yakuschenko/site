import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

export async function up({ db, payload, req }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
   CREATE TYPE "public"."enum_projects_exteriors_content_source" AS ENUM('mock', 'database');
  ALTER TABLE "projects_exteriors" ALTER COLUMN "image" DROP NOT NULL;
  ALTER TABLE "projects_exteriors" ADD COLUMN "photo_id" integer;
  ALTER TABLE "projects_exteriors" ADD COLUMN "is_primary" boolean DEFAULT false;
  ALTER TABLE "projects" ADD COLUMN "exteriors_content_source" "enum_projects_exteriors_content_source" DEFAULT 'mock';
  ALTER TABLE "projects_exteriors" ADD CONSTRAINT "projects_exteriors_photo_id_media_id_fk" FOREIGN KEY ("photo_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  CREATE INDEX "projects_exteriors_photo_idx" ON "projects_exteriors" USING btree ("photo_id");`)
}

export async function down({ db, payload, req }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
   ALTER TABLE "projects_exteriors" DROP CONSTRAINT "projects_exteriors_photo_id_media_id_fk";

  DROP INDEX "projects_exteriors_photo_idx";
  ALTER TABLE "projects_exteriors" ALTER COLUMN "image" SET NOT NULL;
  ALTER TABLE "projects_exteriors" DROP COLUMN "photo_id";
  ALTER TABLE "projects_exteriors" DROP COLUMN "is_primary";
  ALTER TABLE "projects" DROP COLUMN "exteriors_content_source";
  DROP TYPE "public"."enum_projects_exteriors_content_source";`)
}
