import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

export async function up({ db, payload, req }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
   CREATE TYPE "public"."enum_projects_interiors_content_source" AS ENUM('mock', 'database');
  ALTER TABLE "projects_interiors" ALTER COLUMN "image" DROP NOT NULL;
  ALTER TABLE "projects_interiors" ADD COLUMN "photo_id" integer;
  ALTER TABLE "projects" ADD COLUMN "interiors_content_source" "enum_projects_interiors_content_source" DEFAULT 'mock';
  ALTER TABLE "projects_interiors" ADD CONSTRAINT "projects_interiors_photo_id_media_id_fk" FOREIGN KEY ("photo_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  CREATE INDEX "projects_interiors_photo_idx" ON "projects_interiors" USING btree ("photo_id");`)
}

export async function down({ db, payload, req }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
   ALTER TABLE "projects_interiors" DROP CONSTRAINT "projects_interiors_photo_id_media_id_fk";

  DROP INDEX "projects_interiors_photo_idx";
  ALTER TABLE "projects_interiors" ALTER COLUMN "image" SET NOT NULL;
  ALTER TABLE "projects_interiors" DROP COLUMN "photo_id";
  ALTER TABLE "projects" DROP COLUMN "interiors_content_source";
  DROP TYPE "public"."enum_projects_interiors_content_source";`)
}
